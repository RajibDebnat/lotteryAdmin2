"use strict";
console.log("Script is running...");

document.getElementById("receiptForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const amount = document.getElementById("amount").value;
  const journalNumber = document.getElementById("journalNumber").value;
  const rrno = document.getElementById("RRNO").value;
  const fromAccount = document.getElementById("fromAccount").value;
  const toAccount = document.getElementById("toAccount").value;
  const beneficiaryName = document.getElementById("beneficiaryName").value;
  const transactionDate = document.getElementById("transactionDate").value;
  const transactionTime = document.getElementById("transactionTime").value;

  const canvas = document.getElementById("receiptCanvas");
  canvas.width = 555;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");

  // Load the PNG image
  const img = new Image();
  img.crossOrigin = "anonymous"; // If needed
  img.src = "./image/real.png";

  img.onload = () => {
    // Set canvas to image size to avoid stretching
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    // Calculate scale factor based on original 1000 height
    const scale = canvas.height / 1000;

    // Set text style
    ctx.fillStyle = "white";
    ctx.font = `${28 * scale}px Arial`;

    // Calculate relative positions
    const bottomOffset = canvas.height * 0.6;
    const gap = canvas.height * 0.053;
    const topPadding = canvas.height * 0.08; // Slightly increased for balanced spacing
    const bottomPadding = canvas.height * 0.045; // Padding from bottom
    const labelX = canvas.width * 0.09; // approx 60/555
    const colonX = canvas.width / 2;
    const valueX = colonX + canvas.width * 0.04; // Increased space after colon

    // Starting Y position from bottom with padding
    let y = canvas.height - (bottomOffset + bottomPadding) + topPadding;

    // Function to mask account numbers
    const maskAccount = (account) => {
      if (account.length <= 4) return account;
      return (
        account.substring(0, 2) +
        "XXXXX" +
        account.substring(account.length - 2)
      );
    };

    // Function to format date as DD MMM YYYY
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    // Function to format time with leading zero for hours
    const formatTime = (timeStr) => {
      const parts = timeStr.split(" ");
      const timePart = parts[0];
      const ampm = parts[1];
      const [h, m, s] = timePart.split(":");
      const hh = h.padStart(2, "0");
      const mm = m.padStart(2, "0");
      return `${hh}:${mm}:${s} ${ampm}`;
    };

    // Function to draw label, colon, and value
    const drawField = (label, value, yPos) => {
      ctx.font = `${20 * scale}px 'Roboto', Arial`; // Normal for label
      ctx.fillText(label, labelX, yPos); // Label at left
      ctx.font = `700 ${20 * scale}px 'Roboto', Arial`; // Bold for colon and value
      ctx.fillText(": ", colonX, yPos); // Colon at canvas center
      ctx.fillText(value, valueX, yPos); // Value left-aligned after colon

      return 0; // No extra height needed
    };

    // Draw text with gap
    drawField("Amount", `  Nu. ${amount}.00`, y);
    y += gap;

    drawField("Jrnl. No", `  ${journalNumber}`, y);
    y += gap;

    drawField("RRNO", `  ${rrno}`, y);
    y += gap;

    drawField("From Account No", `  ${maskAccount(fromAccount)}`, y);
    y += gap;

    drawField("To Account No", `  ${maskAccount(toAccount)}`, y);
    y += gap;

    drawField("Beneficiary Name", `  ${beneficiaryName}`, y);
    y += gap;

    drawField("Date", `  ${formatDate(transactionDate)}`, y);
    y += gap;

    drawField("Time", `  ${formatTime(transactionTime)}`, y);

    // Show the container
    document.getElementById("receiptContainer").style.display = "block";
  };

  // Download functionality
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "receipt.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

// Current time button
document.getElementById("currentTimeBtn").addEventListener("click", () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeString = `${hours
    .toString()
    .padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  document.getElementById("transactionTime").value = timeString;
});
