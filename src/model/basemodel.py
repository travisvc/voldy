from datetime import datetime
import numpy as np
import scipy.stats as stats
from synth.utils.helpers import convert_prices_to_time_format, adjust_predictions
import bittensor as bt
import matplotlib.pyplot as plt
import seaborn as sns
from src.core.config import Config

class BaseModel():
    NAME = "base"
    
    def __init__(self, distribution: str, dist_parameters: list = [0.0177], parameters_bounds: list = [(0.001, 0.1)], ) -> None:
        self.distribution = distribution
        self.dist_parameters = dist_parameters
        if self.distribution == 'normal':
            self.parameters_bounds = [(0.001, 0.1)]
        elif self.distribution == 't':
            self.parameters_bounds = [(0.001, 0.1), (3.01, 10)]
        elif self.distribution == 'genhyperbolic':
            self.parameters_bounds = [(0.001, 0.1), (-2, 1), (0.001, 3), (-1, 1)]

    def predict(
        self,
        current_price: float,
        current_time: datetime,
        time_increment: int,
        time_length: int
    ) -> np.ndarray:
        num_simulations = Config.NUM_SIMULATIONS
        one_hour = 3600
        dt = time_increment / one_hour
        self.volatility = self.dist_parameters[0]
        sigma = self.volatility * np.sqrt(1/24)  # Convert daily volatility to hourly volatility
        num_steps = int(time_length / time_increment)
        std_dev = sigma * np.sqrt(dt)
        scale = std_dev # Default scale, overwritten if necessary
        size = (num_simulations, num_steps)
        
        if self.distribution == 'normal':
            simulated_values = np.random.normal(0, 1, size=size)

        elif self.distribution == 't':
            nu = self.dist_parameters[1]
            scale = std_dev * np.sqrt((nu - 2) / nu)
            simulated_values = np.random.standard_t(nu, size=size)
        
        elif self.distribution == 'genhyperbolic':
            p = self.dist_parameters[1]
            a = self.dist_parameters[2]
            b = self.dist_parameters[3]
            r = stats.genhyperbolic.rvs(p, a, b, size=size)
            m, v = stats.genhyperbolic.stats(p, a, b, moments="mv")
            m = float(m)
            v = float(v)
            if not np.isfinite(m) or not np.isfinite(v) or v <= 0:
                raise ValueError("Invalid GH moments")

            # Standardize and scale to desired std_dev
            simulated_values = (r - m) / np.sqrt(v)
            
        price_change_pcts = simulated_values * scale
        cumulative_returns = np.cumprod(1 + price_change_pcts, axis=1)
        cumulative_returns = np.insert(cumulative_returns, 0, 1.0, axis=1)
        price_paths = current_price * cumulative_returns

        # Convert numpy array to list format to get the format synth evaluation functions want
        predictions = convert_prices_to_time_format(
        price_paths.tolist(), str(current_time), time_increment
    )
        return predictions

    