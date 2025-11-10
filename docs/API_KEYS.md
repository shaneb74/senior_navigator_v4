# API Keys & Credentials - Developer Setup Guide

## 🔑 Required API Keys

### OpenAI API Key (Required for LLM features)

**Where to get it:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)

**How to configure:**
```bash
cd backend
cp .env.example .env
# Edit .env and replace sk-your-api-key-here with your actual key
```

**Important:**
- ⚠️ Never commit `.env` file to Git (already in .gitignore)
- ⚠️ Each developer should use their own API key
- ⚠️ Keys are personal - don't share in Slack/email/docs

---

## 💰 Cost Considerations

**OpenAI API Costs (GPT-4o-mini):**
- Input: $0.150 per 1M tokens (~$0.00015 per assessment)
- Output: $0.600 per 1M tokens (~$0.0006 per assessment)
- **Average cost per assessment: ~$0.0003 (3 cents per 100 assessments)**

**Monthly estimates:**
- Development/testing (100 assessments): ~$0.03
- Production (10,000 assessments): ~$3.00

**Recommended:**
- Development: Use personal OpenAI account with $5 credit
- Production: Use company OpenAI account with billing alerts

---

## 🔐 Production Key Management

**For production deployment, use one of these:**

### Option 1: Environment Variables (AWS/GCP/Azure)
```bash
# AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/senior-navigator/openai-api-key" \
  --value "sk-proj-xxx" \
  --type "SecureString"

# Then reference in deployment:
OPENAI_API_KEY=$(aws ssm get-parameter --name "/senior-navigator/openai-api-key" --with-decryption --query 'Parameter.Value' --output text)
```

### Option 2: Secrets Manager (Kubernetes)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openai-credentials
type: Opaque
stringData:
  OPENAI_API_KEY: sk-proj-xxx
```

### Option 3: Vault (HashiCorp)
```bash
vault kv put secret/senior-navigator openai_api_key=sk-proj-xxx
```

---

## 🧪 Testing Without API Key

**The backend works without an API key!**

Set `FEATURE_GCP_LLM_TIER=off` in `.env` to use deterministic-only mode:
```bash
FEATURE_GCP_LLM_TIER=off
```

This is useful for:
- Development without OpenAI costs
- Testing core scoring logic
- CI/CD pipelines
- Demos

---

## 📞 Who to Contact

**If you need access to production API keys:**
- Contact: DevOps Team / Security Team
- Request: Access to Senior Navigator OpenAI credentials
- Process: [Link to your internal key request process]

**For development/testing:**
- Use your personal OpenAI account
- Get $5 free credit at https://platform.openai.com/signup

---

## ⚠️ Security Reminders

1. **Never** commit API keys to Git
2. **Never** share keys in Slack/email/Jira
3. **Never** hardcode keys in source code
4. **Always** use environment variables
5. **Always** rotate keys if accidentally exposed
6. **Report** any suspected key leaks immediately to security team

---

## 🔄 Key Rotation

**If a key is compromised:**
1. Revoke old key at https://platform.openai.com/api-keys
2. Generate new key
3. Update environment variables in all environments
4. Restart backend servers

**Recommended rotation schedule:**
- Development keys: Every 90 days
- Production keys: Every 30-60 days or after team member departure
