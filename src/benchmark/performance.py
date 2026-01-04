import requests
from src.training.evaluator import Evaluator
from datetime import datetime, timedelta
from src.model.basemodel import BaseModel
from src.model.mertonmodel import MertonModel
from src.model.egarchmodel import EGARCHModel
import polars as pl
from typing import Optional
from src.core.constants import SIMULATIONS_PER_PROMPT_BACKTESTING
from src.core.config import Config
import json
import time
from src.training.utils import db_manager


class Performance:
    """
    Calculate performance of a model on real prompts in a given time range.
    """
    
    API_URL = "https://api.synthdata.co/validation/scores/historical"
    MAX_RANGE_DAYS = 6
    
    def __init__(
        self,
        model_id: str
    ):
        self.model_id = model_id
        self.simulations_per_prompt = SIMULATIONS_PER_PROMPT_BACKTESTING
        self.model_mapping = {
        "base": BaseModel,
        "merton": MertonModel,
        "egarch": EGARCHModel
    }
        
        # Results storage
        self.results_df: pl.DataFrame = None


    def _load_model(self) -> BaseModel | MertonModel | EGARCHModel:
        """Get the model from the database."""
        model_info = db_manager.get_model_by_model_id(self.model_id)
        model_parameters = model_info.get("parameters")
        model_class = self.model_mapping.get(model_info.get("model"))
        self.model = model_class(distribution=model_info.get("distribution"), dist_parameters=model_parameters)
        self.asset = model_info.get("asset")
        self.time_length = model_info.get("time_length")


    def _get_prompts(
        self,
        start_time: str,
        end_time: str
    ) -> list[dict]:
        """
        Fetch top miners (with prompt_score == 0) from the API to get all the unique prompts.
        
        Args:
            asset: Asset to query (BTC, ETH, SOL, XAU)
            time_length: Time length in seconds (3600 or 86400)
            start_time: Start time in ISO format
            end_time: End time in ISO format
            
        Returns:
            List of miner results with zero prompt score
        """
        # API request is maximum of MAX_RANGE_DAYS days, so split in chunks if longer
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        all_data = []
        current_start = start_dt
        
        while current_start < end_dt:
            # Calculate the end of this specific chunk
            current_end = min(current_start + timedelta(days=self.MAX_RANGE_DAYS), end_dt)
            
            params = {
                "from": current_start.isoformat().replace('+00:00', 'Z'),
                "to": current_end.isoformat().replace('+00:00', 'Z'),
                "asset": self.asset,
                "time_length": self.time_length,
                "time_increment": 60 if self.time_length == 3600 else 300
            }
        
            try:
                response = requests.get(self.API_URL, params=params)
                response.raise_for_status()

                chunk_data = response.json()
                all_data.extend(chunk_data)

                current_start = current_end
                time.sleep(1) # sleep to avoid rate limiting
            
            except requests.exceptions.RequestException as e:
                print(f"Error fetching data: {e}")
                return []
        # Filter for miners with prompt_score == 0 to get unique prompts
        seen_times = set()
        unique_prompts = []
        for item in all_data:
            scored_time = item.get("scored_time")
            # Check if prompt_score is 0 AND we haven't seen this scored_time yet
            if item.get("prompt_score") == 0 and scored_time not in seen_times:
                unique_prompts.append(item)
                seen_times.add(scored_time)
        return unique_prompts


    def _process_single_prompt(self, prompt: dict) -> dict:
        """Process a single prompt and evaluate with our model."""
        asset = self.asset
        time_length = self.time_length
        score_timestamp = datetime.fromisoformat(
            prompt.get('scored_time').replace('Z', '+00:00')
        )
        # score_time is time_length after start, request is sent 60 seconds before start time
        timestamp = score_timestamp - timedelta(seconds=time_length) - timedelta(seconds=60)
        
        # Run our model for this prompt, save all the scores
        our_result = Evaluator.process_single_timestamp(
            timestamp,
            self.model,
            asset,
            time_length,
            self.simulations_per_prompt
        )['scores']
        return {
            "request_timestamp": timestamp,
            'scores': our_result
        }

    def _evaluate(self, prompts: list[dict]) -> pl.DataFrame:
        """
        Evaluate our model performance against prompts.
        
        Args:
            prompts: List of prompts from get_prompts()
            
        Returns:
            DataFrame with evaluation results
        """
        records = [self._process_single_prompt(prompt) for prompt in prompts]
        self.results_df = pl.DataFrame(records)
        return self.results_df


    def run(
        self,
        start_time: str,
        end_time: str
    ) -> pl.DataFrame:
        """
        Fetch prompts and check performance of our model
        
        Args:
            start_time: Start time in ISO format
            end_time: End time in ISO format
            
        Returns:
            DataFrame with evaluation results
        """
        self._load_model()
        prompts = self._get_prompts(start_time, end_time)
        
        if not prompts:
            print("No prompts found")
            return pl.DataFrame()
        
        prompt_scores = self._evaluate(prompts)
        db_manager.save_performance(self.model_id, prompt_scores)
        
        return prompt_scores 

if __name__ == "__main__":
    performance = Performance(model_id="d691a7ebccc14633a29f764438092920")
    performance.run(
        start_time='2025-12-29T00:00:00Z',
        end_time='2025-12-30T00:00:00Z'
    )