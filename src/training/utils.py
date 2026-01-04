import polars as pl
import matplotlib.pyplot as plt
from src.core.config import Config
import json


def describe_results(results_table: pl.DataFrame) -> tuple[float, float, float]:
    """
    Print basic statistics of the results table.
    
    Args:
        results_table: A Polars DataFrame containing 'averagescore', 'minscore', 'maxscore' columns.
        
    Returns:
        Tuple of (average_score, average_min_score, average_max_score)
    """
    if results_table is None:
        raise ValueError("No results available. Run evaluation first.")
    
    average_score = results_table['averagescore'].mean()
    average_min_score = results_table['minscore'].mean()
    average_max_score = results_table['maxscore'].mean()
    
    print("Results Table Description:")
    print(f"Number of Entries: {results_table.height}")
    print(f"Average CRPS Score: {average_score}")
    print(f"Average minimum CRPS Score: {average_min_score}")
    print(f"Average maximum CRPS Score: {average_max_score}")
    
    return average_score, average_min_score, average_max_score


def plot_results(
    results_table: pl.DataFrame,
    other_results: pl.DataFrame = None,
    filename: str = "model_evaluation.png"
) -> None:
    """
    Plot evaluation results. Optionally compare with another results DataFrame.
    
    Args:
        results_table: Primary results DataFrame with 'timestamp', 'averagescore', 
                       'minscore', 'maxscore' columns.
        other_results: Optional second results DataFrame for comparison.
        filename: Output filename for the plot.
    """
    if results_table is None:
        raise ValueError("No results available. Run evaluation first.")
    
    plt.figure()
    plt.plot(
        results_table['timestamp'],
        results_table['averagescore'],
        label='Average CRPS Score (Model 1)'
    )
    plt.fill_between(
        results_table['timestamp'],
        results_table['minscore'],
        results_table['maxscore'],
        color='lightgray',
        label='Min-Max Range (Model 1)'
    )
    
    if other_results is not None:
        plt.plot(
            other_results['timestamp'],
            other_results['averagescore'],
            label='Average CRPS Score (Model 2)'
        )
        plt.fill_between(
            other_results['timestamp'],
            other_results['minscore'],
            other_results['maxscore'],
            color='lightblue',
            label='Min-Max Range (Model 2)'
        )
    
    plt.xlabel('Timestamp')
    plt.ylabel('CRPS Score')
    plt.title('Model Evaluation Over Time')
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(filename)


class DatabaseManager:
    def __init__(self):
        self.params_path = Config.PARAMS_PATH
        self.performance_path = Config.PERFORMANCE_PATH
    

    def get_model_by_model_id(self, model_id: str) -> dict:
        """
        Get model data for a given model ID.
        """
        with open(self.params_path, 'r') as f:
            data = json.load(f)
        model_list = data.get("models", [])
        matching_models = next((item for item in model_list if item["id"] == model_id), None) # model id are unique so next can be used
        if matching_models is None:
            raise ValueError(f"Model with ID {model_id} not found.")
        return matching_models

    def get_all_models(self) -> list[dict]:
        with open(self.params_path, 'r') as f:
            data = json.load(f)
        model_list = data.get("models", [])
        return model_list

    def save_params(self, params: dict):
        """Append parameters to JSON file."""
        with open(self.params_path, 'r') as f:
            data = json.load(f)
        data["models"].append(params)
        with open(self.params_path, 'w') as f:
            json.dump(data, f, indent=2)

    def get_performance_by_model_id(self, model_id: str) -> dict:
        """
        Get performance data for a given model ID.
        """
        with open(self.performance_path, 'r') as f:
            data = json.load(f)
        matching_models = [item for item in data if item["id"] == model_id]
        return matching_models if matching_models else None

    def get_performance_by_asset_and_time_length(self, asset: str, time_length: int) -> dict:
        """
        Get performance data for a given model ID.
        """
        with open(self.performance_path, 'r') as f:
            data = json.load(f)
        matching_models = [item for item in data if item["asset"] == asset and item["time_length"] == time_length]
        return matching_models if matching_models else None

    def save_performance(self, model_id: str, df: pl.DataFrame):
        """
        Append performance data to the JSON file.
        Args:
            model_id: The ID of the model
            df: The performance DataFrame with columns 'request_timestamp' and 'scores'
        """
        # transform datetime to string to ensure JSON compatibility
        df = df.with_columns(
            pl.col("request_timestamp").cast(pl.String))
        # transform the rows into a list of dictionaries
        history_list = df.to_dicts()

        output = {
            "id": model_id,
            "history": history_list
        }

        with open(self.performance_path, 'r') as f:
            data = json.load(f)
        data.append(output)
        with open(self.performance_path, 'w') as f:
            json.dump(data, f, indent=2)

# initialize database manager once
db_manager = DatabaseManager()