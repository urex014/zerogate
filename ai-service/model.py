import os
import json
import urllib.request
import numpy as np
import cv2
from PIL import Image
import onnxruntime as ort

# 1. Silence the ONNX warnings
os.environ["ORT_LOGGING_LEVEL"] = "3"

# 2. Load the lightweight ONNX model (CPU mode)
session = ort.InferenceSession("resnet50-v1-7.onnx", providers=['CPUExecutionProvider'])

# 3. Load the ImageNet Dictionary (Runs once when the server starts)
try:
    with open("imagenet_class_index.json", "r") as f:
        imagenet_classes = json.load(f)
except FileNotFoundError:
    print("Downloading ImageNet labels...")
    url = "https://storage.googleapis.com/download.tensorflow.org/data/imagenet_class_index.json"
    urllib.request.urlretrieve(url, "imagenet_class_index.json")
    with open("imagenet_class_index.json", "r") as f:
        imagenet_classes = json.load(f)


def extract_features(image_bytes):
    """Takes an image file, runs it through ResNet50, and returns a 1000-D vector."""
    image_bytes.seek(0)
    
    # Safely load the image using PIL
    try:
        pil_img = Image.open(image_bytes).convert('RGB')
        img = np.array(pil_img)
        img = img[:, :, ::-1].copy() # Convert RGB to BGR for OpenCV
    except Exception as e:
        print(f"Error loading image: {e}")
        return None

    # Resize and Preprocess for ResNet
    img = cv2.resize(img, (224, 224))
    
    # Cast to float32 to prevent the strict math error
    img = img.astype(np.float32) / 255.0
    img = (img - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / \
          np.array([0.229, 0.224, 0.225], dtype=np.float32)

    img = img.transpose(2, 0, 1) # Change to (Channels, Height, Width)
    img = np.expand_dims(img, axis=0) # Add batch dimension

    # Run Inference
    inputs = {session.get_inputs()[0].name: img}
    prediction = session.run(None, inputs)[0]
    
    return prediction.flatten().tolist()


def get_top_tags(vector, top_k=3):
    """Takes the 1000-D vector and maps the highest scores to real English words."""
    predictions = np.array(vector)
    
    # Get the indices of the top 3 highest scores
    top_indices = predictions.argsort()[-top_k:][::-1]
    
    # Map indices to human-readable labels
    tags = []
    for i in top_indices:
        class_name = imagenet_classes[str(i)][1]
        # Clean up the name (e.g., "running_shoe" -> "running shoe")
        tags.append(class_name.replace("_", " "))
        
    return tags