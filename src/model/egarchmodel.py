from datetime import datetime
import numpy as np
import scipy.stats as stats
from synth.utils.helpers import convert_prices_to_time_format, adjust_predictions
import bittensor as bt
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
import seaborn as sns
from src.core.config import Config
from scipy.special import gamma

class EGARCHModel():
    NAME = "egarch"
    
    def __init__(self, distribution: str, dist_parameters: list) -> None:
        self.distribution = distribution
        self.dist_parameters = dist_parameters
        # bound order omega (initial vola), omega (constant),alpha (shock effect), beta (clustering), gamma (leverage effect)
        self.parameters_bounds = [(0.001, 0.05), (-0.3, 0.1),(0.001, 0.1), (0.975, 0.985), (-0.2, 0.1)]
        if self.distribution == 'normal':
            self.parameters_bounds += []
        elif self.distribution == 't':
            self.parameters_bounds += [(3.01, 10)]
        elif self.distribution == 'genhyperbolic':
            self.parameters_bounds += [(-2, 1), (0.001, 3), (-1, 1)]
        self.constant = None # calculate in EGARCH function if None (so it is only done once)

    def predict(self, current_price: float, current_time: datetime, time_increment: int, time_length: int) -> np.ndarray:
        num_simulations = Config.NUM_SIMULATIONS
        initial_volatility = self.dist_parameters[0]  
        omega = self.dist_parameters[1]
        alpha = self.dist_parameters[2] 
        beta = self.dist_parameters[3] 
        gamma = self.dist_parameters[4] 
        initial_volatility = initial_volatility * np.sqrt(1/24) # daily to hourly (not important but to keep consistency)
        one_hour = 3600
        dt = time_increment / one_hour
        num_steps = int(time_length / time_increment)
        std_dev = np.full((num_simulations, 1), initial_volatility * np.sqrt(dt))
        
        price_change_pcts = np.zeros((num_simulations, num_steps))

        if self.constant is None:
            self._calculate_constant()

        for timestep in range(num_steps):
            simulated_values = self._simulate_values((num_simulations, 1))
            returns = simulated_values * std_dev
            price_change_pcts[:, timestep] = returns.flatten()
            # update volatility for next step
            std_dev = self._EGARCH(std_dev, returns, omega, alpha, beta, gamma)
            
        cumulative_returns = np.cumprod(1 + price_change_pcts, axis=1)
        cumulative_returns = np.insert(cumulative_returns, 0, 1.0, axis=1)
        # insert current price at the beginning of each simulation (synth wants this)
        price_paths = current_price * cumulative_returns
        predictions = convert_prices_to_time_format(
            price_paths.tolist(), str(current_time), time_increment
        )
        return predictions

    
    def _EGARCH(self, previous_volatility: float, previous_return: float, omega: float, alpha: float, beta: float, gamma: float) -> float:
        previous_variance = previous_volatility**2
        log_previous_variance = np.log(previous_variance)
        z = previous_return / previous_volatility
        z_plus = np.abs(z)
        log_variance = omega + beta * log_previous_variance + alpha * (z_plus - self.constant) + gamma * z
        variance = np.exp(log_variance)
        volatility = np.sqrt(variance)
        return volatility

    
    def _simulate_values(self, size):
        if self.distribution == 'normal':
            simulated_values = np.random.normal(0, 1, size=size)

        elif self.distribution == 't':
            nu = self.dist_parameters[5]
            simulated_values = np.random.standard_t(nu, size=size) * np.sqrt((nu - 2) / nu)
        
        elif self.distribution == 'genhyperbolic':
            p = self.dist_parameters[5]
            a = self.dist_parameters[6]
            b = self.dist_parameters[7]
            r = stats.genhyperbolic.rvs(p, a, b, size=size)
            m, v = stats.genhyperbolic.stats(p, a, b, moments="mv")
            m = float(m)
            v = float(v)
            if not np.isfinite(m) or not np.isfinite(v) or v <= 0:
                raise ValueError("Invalid GH moments")

            # Standardize and scale to desired std_dev
            simulated_values = (r - m) / np.sqrt(v)
        return simulated_values
    

    def _calculate_constant(self) -> float:
        if self.distribution == 'normal':
            self.constant = 0.798
        elif self.distribution == 't':
            nu = self.dist_parameters[5]
            self.constant = (2 * np.sqrt(nu - 2) * gamma((nu + 1) / 2))/(nu - 1) * np.sqrt(np.pi) * gamma(nu / 2)
        elif self.distribution == 'genhyperbolic':
            self.constant = np.mean(np.abs((self._simulate_values(10000))))
            print(self.constant)
      
