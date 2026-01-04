import os
import numpy as np
import polars as pl
from src.model.basemodel import BaseModel
from src.model.mertonmodel import MertonModel
from src.model.egarchmodel import EGARCHModel
from datetime import datetime
from synth.utils.helpers import adjust_predictions
from synth.validator import prompt_config
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
from typing import Dict, Any
import time
from src.training.price_data_provider import PriceDataProvider
from synth.validator.crps_calculation import calculate_crps_for_miner


_price_data_provider = PriceDataProvider()


class Evaluator:
    """
    Evaluator class for backtesting models against historical data.
    """
    
    def __init__(
        self,
        model: BaseModel | MertonModel | EGARCHModel,
        asset: str,
        time_length: int,
        start_time: str,
        end_time: str,
        simulations_per_prompt: int,
        max_workers: int = None
    ):
        self.model = model
        self.asset = asset
        self.time_length = time_length
        self.start_time = start_time
        self.end_time = end_time
        self.simulations_per_prompt = simulations_per_prompt
        self.max_workers = max_workers if max_workers else min(os.cpu_count(), 8)
        
        # Results storage
        self.results_table: pl.DataFrame = None
        self.average_score: float = None
        self.detailed_crps_data: list = []

    @staticmethod
    def process_single_timestamp(
        timestamp: datetime,
        model: BaseModel | MertonModel,
        asset: str,
        time_length: int,
        simulations_per_prompt: int,
        lock=None,
        request_history=None
    ) -> Dict[str, Any]:
        """
        Process a single timestamp: fetch real price data, run simulations, and calculate scores.
        This function is designed to be called in parallel.
        """
        # only two time lengths & increments exist, 3600 together with 60 and 86400 with 300
        if time_length == 3600:
            time_increment = 60
        else:
            time_increment = 300
        
        # scoring intervals are different for time_length 3600 and 86400
        scoring_intervals = (
            prompt_config.HIGH_FREQUENCY.scoring_intervals
            if time_length == prompt_config.HIGH_FREQUENCY.time_length
            else prompt_config.LOW_FREQUENCY.scoring_intervals
        )
        
        # data is only available for time_length 3600 and 86400, so is fetched here
        real_price = _price_data_provider.fetch_data(asset, timestamp, time_length, time_increment, lock, request_history)
        current_price = real_price[0]
        
        scores = []
        
        # possibility of having several simulations per day to get average score
        for _ in range(simulations_per_prompt):
            simulation_runs = model.predict(current_price, timestamp, time_increment, time_length)
            
            # changing format of simulation runs for synth function calculate_crps_for_miner
            simulation_runs = adjust_predictions(list(simulation_runs))
            simulation_runs = np.array(simulation_runs).astype(float)

            score, _ = calculate_crps_for_miner(
                simulation_runs, np.array(real_price), time_increment, scoring_intervals
            )
            scores.append(score)
        
        return {
            "timestamp": timestamp,
            "averagescore": np.mean(scores),
            "minscore": np.min(scores),
            "maxscore": np.max(scores),
            "scores": scores
        }

    def _generate_timestamps(self) -> list[datetime]:
        """Generate all evaluation timestamps based on start/end time and time_length."""
        first_timestamp = datetime.strptime(self.start_time, "%Y-%m-%dT%H:%M:%S")
        last_timestamp = datetime.strptime(self.end_time, "%Y-%m-%dT%H:%M:%S")
        
        timestamps = []
        timestamp = first_timestamp
        while timestamp <= last_timestamp:
            timestamps.append(timestamp)
            timestamp += np.timedelta64(self.time_length, 's')
        
        return timestamps

    def run(self) -> tuple[float, pl.DataFrame, list]:
        """
        Run the evaluation.
        Model is evaluated using historical data. First backtest starts at furthest date back,
        second one is one time_length further, looping through the data.
        """
        timestamps = self._generate_timestamps()
        results_data = []
        
        # needed for rate limiting
        manager = multiprocessing.Manager()
        shared_lock = manager.Lock()
        shared_history = manager.list()

        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [
                executor.submit(
                    Evaluator.process_single_timestamp,
                    ts,
                    self.model,
                    self.asset,
                    self.time_length,
                    self.simulations_per_prompt,
                    shared_lock,
                    shared_history
                )
                for ts in timestamps
            ]
            
            try:
                for future in as_completed(futures):
                    results_data.append(future.result())
            except KeyboardInterrupt:
                print("\nUser interrupted. Shutting down pool...")
                executor.shutdown(wait=False, cancel_futures=True)
                raise

        # Sort results by timestamp to maintain order
        results_data.sort(key=lambda x: x["timestamp"])
        
        self.results_table = pl.DataFrame(results_data)
        self.average_score = self.results_table['averagescore'].mean()
        
        # debug
        print(self.model.dist_parameters, self.average_score)
        
        return self.average_score, self.results_table, self.detailed_crps_data
