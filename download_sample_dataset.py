from datasets import load_dataset
import os

print("Connecting to HuggingFace to download RVL-CDIP Document Dataset (Legal & Form classes)...")
try:
    # We must set trust_remote_code=True because the dataset uses a dynamic loading script
    ds = load_dataset("aharley/rvl_cdip", split="train", streaming=True, trust_remote_code=True)
    out_dir = "public/dataset/legal_documents"
    os.makedirs(out_dir, exist_ok=True)
    
    count = 0
    for example in ds:
        # We only want label 11 (forms) and 15 (legal memos/documents)
        lbl = example['label']
        if lbl in [11, 15]:
            filename = os.path.join(out_dir, f"rvl_document_{count}_class{lbl}.jpg")
            example['image'].save(filename)
            print(f"Downloaded: {filename}")
            count += 1
            if count >= 15: # Grab 15 solid samples
                break
    print("\n[SUCCESS] Document dataset locally provisioned inside /public/dataset/legal_documents")
except Exception as e:
    print(f"[ERROR] Failed to stream from HuggingFace: {e}")
