# 🐙 Connect SlotBay to GitHub

Use the **project folder containing package.json**. Upload its contents, including README.md, public and docs.

## 1. Create an empty repository

1. Sign in at [GitHub](https://github.com).
2. Choose **New repository** and name it **slotbay**.
3. Choose public or private visibility.
4. Leave **Add a README**, **Add .gitignore** and **Choose a license** unchecked for the initial import. The project already supplies its README and ignore rules.
5. Click **Create repository** and copy its HTTPS repository URL.

## 2. Open the right folder

In PowerShell, replace the example path with your project folder:

```powershell
Set-Location 'C:/path/to/slotbay'
git --version
git init -b main
git check-ignore .env node_modules
```

The ignore check should list both paths when they exist. Keep the private `.env` and installed `node_modules` out of GitHub. Upload the safe `.env.example` template.

If Git is missing, install [Git for Windows](https://git-scm.com/downloads/win) and reopen PowerShell.

## 3. Save the first commit

```powershell
git add .
git diff --cached --name-only
git commit -m "Add SlotBay parking platform"
```

Before committing, review the displayed file names. Include `README.md`, `package.json`, `package-lock.json`, `src`, `server`, `public` and `docs`. Exclude `.env`, `node_modules` and logs.

If Git asks for your identity, set it for this repository and repeat the commit:

```powershell
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_COMMIT_EMAIL"
git commit -m "Add SlotBay parking platform"
```

Use your verified email or GitHub-provided private commit email.

## 4. Link and upload

Replace `YOUR_USERNAME` with your GitHub username, or paste the exact HTTPS URL from step 1:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/slotbay.git
git push -u origin main
```

Complete the GitHub sign-in prompt. Do not paste your account password into a command.

If Git says `remote origin already exists`, check `git remote -v` first. Only if the destination is wrong, update it with `git remote set-url origin YOUR_REPOSITORY_URL`.

Refresh the repository page: the styled README appears automatically. Include `public` for the logo/banner and `docs` for guide links.

## 5. Future updates

```powershell
git add .
git diff --cached --name-only
git commit -m "Describe your update"
git push
```

Review staged files each time. Do not force-push to resolve an unfamiliar conflict.

## 6. Connect free hosting

Follow the [Render Free + Atlas Free guide](DEPLOYMENT.md). A connected Render service can redeploy when you push changes to its selected branch.

GitHub stores the source. GitHub Pages alone cannot run this project's Express server or background jobs.

Official reference: [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).
