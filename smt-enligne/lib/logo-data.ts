// Load Madagascar logo PNG and convert to data URL
export const getMadagascarLogoDataUrl = async (): Promise<string> => {
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    // Fallback to empty string if logo can't be loaded
    return "";
  }
};
