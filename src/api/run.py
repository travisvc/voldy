import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #["http://localhost:3000", "http://146.190.237.133:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    print("Hello World")
    return "Hello World"

if __name__ == "__main__":
    uvicorn.run("src.api.run:app", host="0.0.0.0", port=8000, reload=True)
