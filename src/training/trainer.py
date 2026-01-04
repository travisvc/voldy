import json
from src.training.optimizer import Optimizer
from src.model.basemodel import BaseModel
from src.model.mertonmodel import MertonModel
from src.model.egarchmodel import EGARCHModel
from src.core.config import Config
from datetime import datetime, date, time, timedelta
import uuid
from src.training.utils import db_manager

class Trainer:
    def __init__(
        self,
        model: BaseModel | MertonModel | EGARCHModel
    ):
        """
        Initialize the Trainer.
        
        Args:
            model: The model to optimize
            params_filepath: Path to parameters JSON file
            assets: List of assets to optimize (default: BTC, ETH, SOL, XAU)
            time_configs: 3600: (60, WEEKS_OF_DATA_3600), 86400: (300, WEEKS_OF_DATA_86400) 
        """
        self.model = model
        self.params_filepath = Config.PARAMS_PATH
        self.assets = Config.ASSETS
        self.time_configs = Config.TIME_CONFIGS
        self.results: dict = {}


    def _calculate_step(self, asset: str, time_length: int) -> str:
        """Calculate the step number for the given asset, time length"""
        with open(self.params_filepath, 'r') as f:
            data = json.load(f)
        existing_steps = [
        m.get("step", 0) for m in data["models"] 
        if (m.get("asset") == asset and 
            m.get("time_length") == time_length and 
            m.get("model") == self.model.NAME and 
            m.get("distribution") == self.model.distribution)
    ]
        return str(max(existing_steps, default=0) + 1)

    def run(self) -> dict:
        """
        Run training for all asset and time length combinations.
            
        Returns:
            Dictionary of results with model names as keys
        """
        today_midnight = datetime.combine(date.today(), time())
        end_time = today_midnight.isoformat()
        
        for asset in self.assets:
            for time_length, (time_increment, weeks) in self.time_configs.items():
                start_time = (today_midnight - timedelta(weeks=weeks)).isoformat()
                
                optimizer = Optimizer(
                    model=self.model,
                    asset=asset,
                    time_length=time_length,
                    start_time=start_time,
                    end_time=end_time
                )
                best_params = optimizer.optimize()
                
                print(f"Best params for {asset} {time_length} {time_increment}: {best_params}")
                
                result = {
                    "asset": asset,
                    "time_length": time_length,
                    "model": self.model.NAME,
                    "distribution": self.model.distribution,
                    "parameters": best_params,
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "step": self._calculate_step(asset, time_length),
                    "id": uuid.uuid4().hex
                }
                self.results.setdefault("models", []).append(result)
                db_manager.save_params(self.results)
        
        return self.results

