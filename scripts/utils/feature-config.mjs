/**
 * Create a feature configuration object
 * @param {boolean} enableMyOrg - Enable My Organization features
 * @param {boolean} enableMyAccount - Enable My Account features
 * @returns {FeatureConfig}
 */
export function createFeatureConfig(
  enableMyOrg = true,
  enableMyAccount = true
) {
  return {
    enableMyOrg,
    enableMyAccount,
  }
}
