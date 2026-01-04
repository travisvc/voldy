from src.benchmark.performance import Performance
from src.core.config import Config
import json
from src.training.utils import db_manager


def main():
    model_list = db_manager.get_all_models()
    
    for model_info in model_list:
        m_id = model_info.get("id")
        print(f"Running performance for model {m_id}")
        performance = Performance(model_id=m_id)
        performance.run(
            start_time='2025-12-23T00:00:00Z',
            end_time='2025-12-30T00:00:00Z'
        )

if __name__ == "__main__":
    main()

