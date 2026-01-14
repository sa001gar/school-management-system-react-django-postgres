"use client";

import React, { useState, useRef, useCallback } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import imageCompression from "browser-image-compression";
import {
  Camera,
  X,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { Button } from "./button";
import { Modal, ModalFooter } from "./modal";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperProps {
  currentImage?: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
  disabled?: boolean;
}

// Generate secure random filename to prevent directory traversal
function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomUUID().replace(/-/g, "");
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  return `student_${timestamp}_${randomString.substring(0, 12)}.${extension}`;
}

// Compress image to target size
async function compressImage(
  file: File,
  targetSizeKB: number = 100
): Promise<File> {
  const options = {
    maxSizeMB: targetSizeKB / 1024,
    maxWidthOrHeight: 500,
    useWebWorker: true,
    fileType: "image/jpeg" as const,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Rename with secure filename
    const secureFilename = generateSecureFilename(file.name);
    return new File([compressedFile], secureFilename, {
      type: compressedFile.type,
    });
  } catch (error) {
    console.error("Image compression failed:", error);
    throw error;
  }
}

// Robust getCroppedImg with rotation
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation = 0,
  filename = "cropped.jpg"
): Promise<File> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Use devicePixelRatio for sharper images
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = (rotation * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();

  // Move the crop origin to the canvas origin (0,0)
  ctx.translate(-cropX, -cropY);
  // Move the origin to the center of the original position
  ctx.translate(centerX, centerY);
  // Rotate around the origin
  ctx.rotate(rotateRads);
  // Move the center of the image back to the origin (0,0)
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        const file = new File([blob], filename, { type: "image/jpeg" });
        resolve(file);
      },
      "image/jpeg",
      0.95
    );
  });
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  currentImage,
  onImageChange,
  disabled = false,
}: ImageCropperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("Image size should be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setIsModalOpen(true);
        setScale(1);
        setRotate(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, 3 / 4));
    },
    []
  );

  const handleCropComplete = async () => {
    if ((!completedCrop || completedCrop.width === 0) && imgSrc) {
      // Try to recover default crop
      if (imgRef.current) {
        const { width, height } = imgRef.current;
        const defaultCrop = centerAspectCrop(width, height, 3 / 4);
        // We need pixel crop, but centerAspectCrop returns percent/pixel depending on helper.
        // Usually helpers return Crop. We need PixelCrop for logic.
        // If manual crop needed, alert is safer.
      }
      alert("Please select a crop area.");
      return;
    }

    if (!imgRef.current || !completedCrop) return;

    setIsProcessing(true);
    try {
      // Use rotation in crop
      const croppedFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        rotate,
        "cropped.jpg"
      );

      const compressedFile = await compressImage(croppedFile, 100);
      const previewUrl = URL.createObjectURL(compressedFile);

      onImageChange(compressedFile, previewUrl);
      setIsModalOpen(false);

      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onImageChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1); // Reset scale
    setRotate(0); // Reset rotate
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <div className="shrink-0">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photo
        </label>
        <div className="relative">
          {currentImage ? (
            <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-amber-200 group bg-gray-50">
              <img
                src={currentImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      inputRef.current?.click();
                    }}
                    className="p-1.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                    title="Change Photo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label
              className={`flex flex-col items-center justify-center w-24 h-32 border-2 border-dashed border-gray-300 rounded-lg transition-colors ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:border-amber-400 hover:bg-amber-50"
              }`}
            >
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Upload</span>
            </label>
          )}

          {!disabled && (
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={onSelectFile}
              className="hidden"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Crop Profile Picture"
        size="lg"
      >
        <div className="flex flex-col h-[600px] max-h-[80vh]">
          {imgSrc && (
            <>
              {/* Crop Area - Scrollable Container */}
              <div className="flex-1 bg-gray-900/5 rounded-t-lg overflow-auto flex items-center justify-center p-4 relative">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={3 / 4}
                  // circularCrop={false}
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    style={{
                      transform: `rotate(${rotate}deg)`,
                      width: `${scale * 100}%`,
                      height: "auto",
                      // Fit logic:
                      // Ensure generic fit if scale is 1?
                      // maxHeight: "60vh" inside here might work but if we rotate?
                      // Let's rely on container constraints and width scaling.
                      maxWidth: "none", // Allow it to overflow container when zoomed
                      transition:
                        "transform 0.1s ease-out, width 0.1s ease-out",
                    }}
                  />
                </ReactCrop>
              </div>

              {/* Controls Footer */}
              <div className="bg-white p-4 border-t border-gray-100 space-y-4 rounded-b-lg">
                <div className="flex items-center gap-6 justify-center">
                  {/* Zoom Control */}
                  <div className="flex items-center gap-3 w-64">
                    <ZoomOut className="w-4 h-4 text-gray-400" />
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                    <ZoomIn className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="w-px h-8 bg-gray-200" />

                  {/* Rotation Control */}
                  <button
                    onClick={() => setRotate((r) => r + 90)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons - Sticky at bottom */}
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              isLoading={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
