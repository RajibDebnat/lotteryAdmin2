// ============================================
// FIREBASE IMPORTS (ES6 Modules)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  ref as dbRef,
  set,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// ============================================
// FIREBASE INITIALIZATION
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBtD7Zdg-a1Uvj4mUsMzpQk2ye_IKyCRgg",
  authDomain: "lotteryproject-2275f.firebaseapp.com",
  databaseURL: "https://lotteryproject-2275f-default-rtdb.firebaseio.com/",
  projectId: "lotteryproject-2275f",
 storageBucket: "lotteryproject-2275f.appspot.com",
  messagingSenderId: "967978667440",
  appId: "1:967978667440:web:7c6fd61a942b93573b5a75",
  measurementId: "G-CS3ZNNPH07",
};
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
getAnalytics(app);

// ============================================
// UTILITIES - FAST IMAGE COMPRESSION
// ============================================

async function compressImage(file) {
  // If file is small enough, skip compression
  if (file.size < 1024 * 1024) {
    return file; // Already small, return original
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const blob = new Blob([event.target.result], { type: file.type });
        const imageBitmap = await createImageBitmap(blob);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Max width 800px, maintain aspect ratio
        let width = imageBitmap.width;
        let height = imageBitmap.height;

        if (width > 800) {
          height = Math.round((height * 800) / width);
          width = 800;
        }

        canvas.width = width;
        canvas.height = height;

        // Fast drawing
        ctx.drawImage(imageBitmap, 0, 0, width, height);
        imageBitmap.close();

        // High quality compression (0.85 instead of 0.7 for faster +better quality)
        canvas.toBlob(
          (compressedBlob) => {
            resolve(compressedBlob);
          },
          "image/jpeg",
          0.85,
          { progressive: true },
        );
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================
// ADMIN UPLOAD HANDLER - SINGLE IMAGE ONLY
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".upload-area").forEach((uploadArea) => {
    const lottery = uploadArea.getAttribute("data-lottery");
    const fileInput = document.querySelector(
      `input[data-lottery="${lottery}"]`,
    );
    const submitBtn = document.querySelector(
      `button[data-lottery="${lottery}"]`,
    );
    const statusMsg = document.querySelector(
      `[data-lottery="${lottery}"].status-message`,
    );
    const previewGrid = document.querySelector(
      `[data-lottery="${lottery}"].preview-grid`,
    );

    let selectedFile = null;

    // Click to upload
    uploadArea.addEventListener("click", () => {
      fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelection(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    function handleFileSelection(file) {
      // Validate: only images
      if (!file.type.startsWith("image/")) {
        showStatus("Only image files are allowed", "error");
        return;
      }

      // Validate: max 5MB
      if (file.size > 5 * 1024 * 1024) {
        showStatus("Image must be smaller than 5MB", "error");
        return;
      }

      selectedFile = file;

      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        previewGrid.innerHTML = `
          <div class="preview-item">
            <img src="${event.target.result}" alt="Preview">
            <p style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">
              ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          </div>
        `;
      };
      reader.readAsDataURL(file);

      submitBtn.disabled = false;
    }

    // Upload handler
    submitBtn.addEventListener("click", async () => {
      if (!selectedFile) return;

      submitBtn.disabled = true;
      submitBtn.classList.add("loading");
      showStatus("Optimizing image...", "info");

      try {
        // 1. Compress image (fast!)
        const compressedBlob = await compressImage(selectedFile);
        const originalSize = (selectedFile.size / 1024 / 1024).toFixed(2);
        const compressedSize = (compressedBlob.size / 1024 / 1024).toFixed(2);

        showStatus(
          `Uploading... (${originalSize}MB → ${compressedSize}MB)`,
          "info",
        );

        // 2. Delete old image from storage (if exists)
        try {
          const oldImageRef = storageRef(
            storage,
            `${lottery}/current-image.jpg`,
          );
          await deleteObject(oldImageRef);
        } catch (err) {
          // Old image doesn't exist, that's fine
          console.log("No previous image to delete");
        }

        // 3. Upload compressed image to storage
        const imageRef = storageRef(storage, `${lottery}/current-image.jpg`);
        await uploadBytes(imageRef, compressedBlob);

        // 4. Get download URL
        const url = await getDownloadURL(imageRef);

        // 5. Save metadata to database (replace, not array!)
        const imageMetadata = {
          name: selectedFile.name,
          url: url,
          uploadedAt: new Date().toISOString(),
          size: compressedBlob.size,
        };

        await set(dbRef(database, lottery), imageMetadata);

        // 6. Success!
        showStatus(
          `✓ Uploaded successfully! (${compressedSize}MB) Now displaying on website.`,
          "success",
        );

        // Reset UI after 2 seconds
        setTimeout(() => {
          selectedFile = null;
          fileInput.value = "";
          previewGrid.innerHTML = "";
          submitBtn.disabled = true;
          statusMsg.classList.remove("show");
        }, 2000);
      } catch (error) {
        console.error("Upload error:", error);
        showStatus(`Error: ${error.message}`, "error");
        submitBtn.disabled = false;
      }

      submitBtn.classList.remove("loading");
    });

    function showStatus(message, type = "info") {
      statusMsg.textContent = message;
      statusMsg.className = `status-message show ${type}`;
    }
  });
});
