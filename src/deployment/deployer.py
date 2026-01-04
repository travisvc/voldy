from datetime import datetime
import json
from src.model.basemodel import BaseModel
from src.model.mertonmodel import MertonModel
from src.model.egarchmodel import EGARCHModel
import bittensor as bt
from synth.miner.price_simulation import get_asset_price
from synth.validator.response_validation_v2 import validate_responses
from typing import Callable, Any
from src.core.config import Config
from src.training.utils import db_manager

class Deployer:
    """
    Production miner that responds to network requests using trained models.
    """
    
    def __init__(self, models_filepath: str = None):
        """
        Initialize the Production miner.
        
        Args:
            models_filepath: Path to models.json config file
        """     
        self.models = db_manager.get_all_models()
        self.model_mapping = {
        "base": BaseModel,
        "merton": MertonModel,
        "egarch": EGARCHModel
        }

    def reload_models(self) -> None:
        """Reload models configuration from file."""
        self.models = db_manager.get_all_models()

    def get_model(self, asset: str, time_length: int, type: str="base", distribution: str="t") -> BaseModel | MertonModel | EGARCHModel:
        """
        Get the appropriate model for an asset and time length.
        
        Args:
            asset: Asset symbol (BTC, ETH, SOL, XAU)
            time_length: Time length in seconds
            type: Type of model (basemodel, mertonmodel, egarchmodel)
            distribution: Distribution of the model (normal, t, genhyperbolic)
            
        Returns:
            Configured BaseModel instance
        """
        model_data = next(
        (m for m in self.models if m["asset"] == asset and m["time_length"] == time_length and m["model"] == type and m["distribution"] == distribution), 
        None
        )
        
        if model_data is not None:
            parameters = model_data.get("parameters")
            model_class = self.model_mapping.get(type)
            return model_class(distribution=distribution, dist_parameters=parameters)
        else:
            # Fallback to default model
            print(f"No model found for asset {asset}, time length {time_length}, type {type}, distribution {distribution}\n Using base model as fallback")
            return self.model_mapping.get("base")(distribution="normal", dist_parameters=[0.0177])

    async def handle_synapse(self, miner_instance: Any, synapse: Any) -> Any:
        """
        Handle incoming synapse request.
        
        Args:
            miner_instance: The miner instance
            synapse: The synapse request
            
        Returns:
            The synapse with simulation_output populated
        """
        simulation_input = synapse.simulation_input
        asset = simulation_input.asset
        current_price = get_asset_price(asset)
        time_length = simulation_input.time_length
        
        model = self.get_model(asset, time_length)
        
        synapse.simulation_output = model.predict(
            current_price,
            simulation_input.start_time,
            simulation_input.time_increment,
            time_length
        )
        
        format_validation = validate_responses(
            synapse.simulation_output,
            simulation_input,
            datetime.fromisoformat(simulation_input.start_time),
            "0",
        )
        bt.logging.info(f'Format check: {format_validation}')
        
        return synapse

    def create_miner_logic(self) -> Callable:
        """
        Create the miner logic function for the Miner class.
        
        Returns:
            Async function that handles synapse requests
        """
        async def miner_logic(miner_instance, synapse):
            return await self.handle_synapse(miner_instance, synapse)
        
        return miner_logic
