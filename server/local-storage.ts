import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadToLocalStorage(base64Image: string): Promise<string> {
  try {
    // Extract format and actual base64 data
    const matches = base64Image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image format");
    }

    const extension = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, "base64");
    
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    fs.writeFileSync(filePath, buffer);
    
    // Return relative URL for serving
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("Local Storage Error:", error);
    throw new Error("Failed to save image locally");
  }
}
