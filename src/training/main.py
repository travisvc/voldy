from src.training.trainer import Trainer
from src.model.basemodel import BaseModel


def main():
    model = BaseModel(distribution='t', dist_parameters=[0.0177, 4])
    
    trainer = Trainer(
        model=model
    )
    trainer.run()


if __name__ == "__main__":
    main()
