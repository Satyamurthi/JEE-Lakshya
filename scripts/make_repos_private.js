const fs = require('fs');
const path = require('path');

// Try to parse .env file manually if it exists
let envToken = '';
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^GITHUB_PAT\s*=\s*(.*)$/m);
    if (match) {
      envToken = match[1].trim();
    }
  }
} catch (e) {
  // Ignore error parsing .env
}

const token = envToken || process.argv[2];

if (!token) {
  console.error('Error: GitHub Personal Access Token (PAT) is missing.');
  console.error('Please define GITHUB_PAT in your .env file or pass it as a command line argument:');
  console.error('  node scripts/make_repos_private.js <your_token>');
  process.exit(1);
}

async function run() {
  try {
    console.log('Fetching repositories...');
    let repos = [];
    let page = 1;
    while (true) {
      const response = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&type=owner`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'NodeJS-Script'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repos: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      if (data.length === 0) break;
      repos = repos.concat(data);
      page++;
    }

    const publicRepos = repos.filter(repo => !repo.private);

    if (publicRepos.length === 0) {
      console.log('No public repositories found. All owned repositories are already private.');
      return;
    }

    console.log(`Found ${publicRepos.length} public repositories to switch to private:`);
    publicRepos.forEach(repo => console.log(` - ${repo.full_name}`));

    console.log('\nUpdating repository visibilities to private...');
    for (const repo of publicRepos) {
      try {
        const updateResponse = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'NodeJS-Script',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            private: true
          })
        });

        if (updateResponse.ok) {
          console.log(`[SUCCESS] Made ${repo.full_name} private.`);
        } else {
          console.error(`[FAILED] Failed to update ${repo.full_name}: ${updateResponse.statusText} (${updateResponse.status})`);
        }
      } catch (err) {
        console.error(`[ERROR] Error updating ${repo.full_name}:`, err.message);
      }
    }
    console.log('\nAll operations completed.');
  } catch (error) {
    console.error('An error occurred during execution:', error.message);
  }
}

run();
