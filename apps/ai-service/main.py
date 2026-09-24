from fastapi import FastAPI

app = FastAPI(
    title="DokanOS AI Service",
    description="AI service for DokanOS marketplace",
    version="0.0.1"
)

@app.get("/")
def health():
    return {
        "app_name": "DokanOS AI Service",
        "version": "0.0.1",
        "status": "healthy"
    }