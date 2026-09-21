// Extends app.json. The Firebase file comes from the EAS file variable
// GOOGLE_SERVICES_JSON on cloud and local EAS builds, and from the local copy
// in the project folder otherwise.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
  },
});
