from datetime import datetime
import numpy as np
import scipy.stats as stats
from synth.utils.helpers import convert_prices_to_time_format, adjust_predictions
import bittensor as bt
import matplotlib.pyplot as plt
import seaborn as sns
from src.core.config import Config

class MertonModel():
    NAME = "merton"
    
    def __init__(self, distribution: str, dist_parameters: list) -> None:
        self.distribution = distribution
        self.dist_parameters = dist_parameters
        self.parameters_bounds = [(0.001, 0.1), (0.001, 0.05), (-0.005, 0.005), (0.001, 0.5)]
        if self.distribution == 'normal':
            self.parameters_bounds += []
        elif self.distribution == 't':
            self.parameters_bounds += [(3.01, 10)]
        elif self.distribution == 'genhyperbolic':
            self.parameters_bounds += [(-2, 1), (0.001, 3), (-1, 1)]

    def predict(self, current_price: float, current_time: datetime, time_increment: int, time_length: int) -> np.ndarray:
        num_simulations = Config.NUM_SIMULATIONS
        mu_drift = 0 # on this small tiemframe we can safely assume drift 0
        sigma = self.dist_parameters[0] # 0.001, 0.1
        lamb = self.dist_parameters[1] # 0.001, 0.05
        mu_j = self.dist_parameters[2] # -0.005, 0.005
        sigma_j = self.dist_parameters[3] # 0.001, 0.5
        one_hour = 3600
        dt = time_increment / one_hour
        num_steps = int(time_length / time_increment)
        size = (num_simulations, num_steps)
        std_dev = sigma * np.sqrt(dt)
        scale = std_dev

        # Simulate jumps
        jump_times = np.random.poisson(lamb * dt, size=size)
        jump_sizes = np.random.normal(mu_j, sigma_j, size=size)
        jumps = np.multiply(jump_times, jump_sizes).cumsum(axis=1)

        drift = (mu_drift - 0.5 * sigma**2 - lamb * (np.exp(mu_j + 0.5 * sigma_j**2) - 1)) * dt

        if self.distribution == 'normal':
            simulated_values = np.random.normal(0, 1, size=size)

        elif self.distribution == 't':
            nu = self.dist_parameters[4]
            scale = std_dev * np.sqrt((nu - 2) / nu)
            simulated_values = np.random.standard_t(nu, size=size)
        
        elif self.distribution == 'genhyperbolic':
            p = self.dist_parameters[4]
            a = self.dist_parameters[5]
            b = self.dist_parameters[6]
            r = stats.genhyperbolic.rvs(p, a, b, size=size)
            m, v = stats.genhyperbolic.stats(p, a, b, moments="mv")
            m = float(m)
            v = float(v)
            if not np.isfinite(m) or not np.isfinite(v) or v <= 0:
                raise ValueError("Invalid GH moments")

            # Standardize and scale to desired std_dev
            simulated_values = (r - m) / np.sqrt(v)

        # Combine Brownian motion and jumps
        diffusion = simulated_values * scale
        price_paths = current_price * np.exp(drift + diffusion + jumps)
        # insert current price at the beginning of each simulation (synth wants this)
        price_paths = np.insert(price_paths, 0, current_price, axis=1)
        
        predictions = convert_prices_to_time_format(
            price_paths.tolist(), str(current_time), time_increment
        )
        return predictions