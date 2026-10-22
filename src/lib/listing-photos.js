export const MAX_ADDITIONAL_PHOTOS = 5;
export function galleryFits(retained, added) {
  return retained >= 0 && added >= 0 && retained + added <= MAX_ADDITIONAL_PHOTOS;
}
