# Security Guidelines for Helm Values

## Local Development Setup

**NEVER commit real secrets to version control!**

### Setting Up Local Secrets

1. Copy the example file:
   ```bash
   cp app-server-local.yaml.example app-server-local.yaml
   cp app-client-local.yaml.example app-client-local.yaml  # if exists
   ```

2. Edit the `-local.yaml` files with your actual credentials

3. The `-local.yaml` files are gitignored and will NOT be committed

### Google OAuth Setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new OAuth 2.0 Client ID
3. Set authorized redirect URIs:
   - For local development: `http://api.local.com/auth/google/callback`
   - For production: `https://your-production-domain.com/auth/google/callback`
4. Copy the Client ID and Client Secret to your local values file

### Important Notes

- **.yaml.example files** - Safe to commit (contain only placeholders)
- **-local.yaml files** - **NEVER commit** (contain real secrets)
- **production.yaml** - Should use external secrets management (Kubernetes Secrets, Vault, etc.)

## What Was Fixed

**Security incident:** Google OAuth credentials were accidentally committed to the repository.

**Actions taken:**
1. Secrets removed from committed files
2. Local values files added to `.gitignore`
3. Example files created for reference

**Required action:**
- **Revoke the exposed OAuth credentials** in Google Cloud Console
- **Create new credentials** and store them only in local (gitignored) files
