export function TextQueryUrl(instrument?: string, experimentNumber?: string, userNumber?: string): string | null {
  if (instrument != null && experimentNumber != null) {
    return `/text/instrument/${instrument}/experiment_number/${experimentNumber}`;
  }
  if (userNumber != null) {
    return `text/generic/user_number/${userNumber}`;
  }
  if (experimentNumber != null) {
    return `text/generic/experiment_number/${experimentNumber}`;
  }
  return null;
}
