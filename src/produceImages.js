// A stand-in photo for listings posted without one, matched to the product
// name. Shown with an "Example photo" label so buyers know it isn't the
// seller's own picture.

import tomatoesImg from "./images/Découvrez combien de pieds de tomate planter par m² pour une récolte optimale.jpg";
import maizeImg from "./images/farm2.jpg";
import poultryImg from "./images/How to Raise Laying Hens - DIY Chicken Feed - Egg Harvesting_.jpg";
import cattleImg from "./images/dash-cattle.jpg";
import vegetablesImg from "./images/farm3.jpg";
import grainsImg from "./images/dash-grains.jpg";
import marketImg from "./images/dash-market.jpg";

const RULES = [
  [/tomato/i, tomatoesImg],
  [/maize|mielie|corn/i, maizeImg],
  [/egg|chicken|poultry|hen|broiler/i, poultryImg],
  [/beef|cattle|cow|goat|sheep|lamb|meat|livestock|ox|bull|pig|pork/i, cattleImg],
  [/mahangu|millet|sorghum|grain|wheat|rice|bean|cowpea|omakunde|groundnut|peanut|seed|flour/i, grainsImg],
  [/spinach|cabbage|lettuce|kale|onion|carrot|pepper|veg|herb|leaf|greens|butternut|pumpkin|squash|potato/i, vegetablesImg],
  [/fruit|melon|mango|orange|banana|apple|grape|papaya|guava/i, marketImg],
];

/** onError for a listing photo: a broken link quietly becomes the example photo. */
export const fallBackToExample = (product) => (event) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = exampleProducePhoto(product);
};

/** A fitting example photo for a product name (falls back to a market stall). */
export function exampleProducePhoto(product) {
  const name = String(product || "");
  const hit = RULES.find(([pattern]) => pattern.test(name));
  return hit ? hit[1] : marketImg;
}

/**
 * Shrinks a photo to a JPEG data URL no wider/taller than maxSide, lowering
 * the quality until it fits maxBytes. Used when Cloudinary isn't set up, so
 * listing photos still work (stored on the listing itself).
 */
export function shrinkPhoto(file, { maxSide = 720, maxBytes = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error("Please choose a photo (JPG or PNG)."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let quality = 0.8;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > maxBytes && quality > 0.35) {
        quality -= 0.1;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > maxBytes) reject(new Error("That photo is too detailed to store. Please try a smaller one."));
      else resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That photo couldn't be read. Please try another."));
    };
    img.src = url;
  });
}
