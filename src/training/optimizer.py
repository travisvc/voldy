from src.training.evaluator import Evaluator
from src.model.basemodel import BaseModel
from src.model.mertonmodel import MertonModel
from src.model.egarchmodel import EGARCHModel
import optuna
from src.core.config import Config
from src.core.constants import SIMULATIONS_PER_PROMPT_TRAINING, NUM_TRIALS

optuna.logging.set_verbosity(optuna.logging.WARNING)


class Optimizer:
    """ Optimize model parameters using Optuna to minimize CRPS score. """
    def __init__(
        self,
        model: BaseModel | MertonModel | EGARCHModel,
        asset: str,
        time_length: int,
        start_time: str,
        end_time: str
    ):
        self.model = model
        self.asset = asset
        self.time_length = time_length
        self.start_time = start_time
        self.end_time = end_time
        self.simulations_per_prompt = SIMULATIONS_PER_PROMPT_TRAINING
        self.n_trials = NUM_TRIALS
        
        # Results storage
        self.study: optuna.Study = None
        self.best_params: list = None
        self.best_score: float = None
    

    def _set_initial_parameters(self):
        """ Check if initial parameters are valid. If so, enqueue this as the first trial. If they are incorrect the study automatically select random parameters from the parameter space (not in this function). """
        if (self.model.dist_parameters and 
            len(self.model.dist_parameters) == len(self.model.parameters_bounds)):
            initial_params = {f"p{i}": val for i, val in enumerate(self.model.dist_parameters)}
            self.study.enqueue_trial(initial_params)
        else:
            print(f"Initial parameters are invalid. Using random parameters from the parameter space.")


    def _select_trial_parameters(self, trial):
        """ Every trial select parameters from the bounds. For some models there are additional constraints, programmed as if else statements. """
        params = []
        length_of_parameters = len(self.model.parameters_bounds)
        
        for i, (low, high) in enumerate(self.model.parameters_bounds):
            param_name = f"p{i}"
            # suggest_float works for all
            # to handle constraints there are if else statements
            if self.model.distribution == 'genhyperbolic' and i == length_of_parameters - 1:
                # |b| < a constraint
                params.append(trial.suggest_float(
                    param_name,
                    0.00001 - params[length_of_parameters - 2],
                    params[length_of_parameters - 2] - 0.00001
                ))
            else:
                params.append(trial.suggest_float(param_name, low, high))
        return params

    def _objective(self, trial):
        """ Optuna objective function to minimize CRPS score. """
        
        
        self.model.dist_parameters = self._select_trial_parameters(trial)
        
        evaluator = Evaluator(
            model=self.model,
            asset=self.asset,
            time_length=self.time_length,
            start_time=self.start_time,
            end_time=self.end_time,
            simulations_per_prompt=self.simulations_per_prompt
        )
        score, _, _ = evaluator.run()
        
        return score

    def optimize(self) -> list:
        """ Run the Optuna optimization and return the best parameters. """
        self.study = optuna.create_study(direction="minimize")
        
        self._set_initial_parameters()
        
        print(f"Starting Optuna optimization ({self.n_trials} trials)...")
        self.study.optimize(self._objective, n_trials=self.n_trials)
        
        self.best_score = self.study.best_value
        self.best_params = list(self.study.best_params.values())
        
        print(f"Best score: {self.best_score}")
        
        return self.best_params


