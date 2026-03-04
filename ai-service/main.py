from fastapi import FastAPI, UploadFile, File
from model import extract_features, get_top_tags
import io

app = FastAPI()

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # Read image bytes
    image_bytes = io.BytesIO(await file.read())
    
    # Extract the mathematical vector
    vector = extract_features(image_bytes)
    
    # For now, we'll return the vector and some placeholder tags
    # In the next step, we can add a simple classifier for real tags
    real_tags = get_top_tags(vector)
    return {
        "filename": file.filename,
        "vector": vector, # Just sending the first 10 for the preview
        "suggested_tags": real_tags
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)