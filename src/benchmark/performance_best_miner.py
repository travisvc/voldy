from datetime import datetime, timedelta
import polars as pl
import json
from src.core.config import Config
import requests
import time
from src.training.utils import db_manager


class PerformanceBestMiner:
    """
    Calculate the best miner performance for each prompt.
    """
    def __init__(self, asset: str, time_length: int):
        self.asset = asset
        self.time_length = time_length
        self.model_id = 'best_miner' + self.asset + str(self.time_length)

    API_URL = "https://api.synthdata.co/validation/scores/historical"
    MAX_RANGE_DAYS = 6
    
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
                "time_length": self.time_length
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

    def _process_single_prompt_best_miner(self, prompt: dict) -> dict:
        """"
        return best miner performance for a single prompt
        """
        score_timestamp = datetime.fromisoformat(
            prompt.get('scored_time').replace('Z', '+00:00')
        )
        timestamp = score_timestamp - timedelta(seconds=self.time_length) - timedelta(seconds=60)
        # get the crps for the prompt
        crps = prompt.get("crps")
        return {
            "request_timestamp": timestamp,
            "scores": crps
        }

    def _evaluate_best_miner(self, prompts: list[dict]) -> pl.DataFrame:
        """
        Calculate the best miner performance for each prompt.
        """
        records = [self._process_single_prompt_best_miner(prompt) for prompt in prompts]
        self.best_miner_df = pl.DataFrame(records)
        return self.best_miner_df

    
    def run(self, start_time: str, end_time: str) -> pl.DataFrame:
        """
        Fetch prompts and get the best miner performance for each prompt.
        """
        prompts = self._get_prompts(start_time, end_time)
        best_miner_df = self._evaluate_best_miner(prompts)
        db_manager.save_performance(self.model_id, best_miner_df)
        return best_miner_df