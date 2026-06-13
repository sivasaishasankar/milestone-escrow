import subprocess
import datetime
import sys
import os

def run_cmd(cmd, env=None, input_data=None):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=env, input=input_data)
    if res.returncode != 0:
        print(f"Error running: {cmd}")
        print(f"Stdout: {res.stdout}")
        print(f"Stderr: {res.stderr}")
        sys.exit(res.returncode)
    return res.stdout.strip()

# 1. Get chronological list of commits from main
print("Getting commit list...")
commits_raw = run_cmd("git log --reverse --format='%H'")
commit_hashes = commits_raw.splitlines()
print(f"Found {len(commit_hashes)} commits to rewrite.")

commit_details = []
for h in commit_hashes:
    msg = run_cmd(f"git log -1 --format='%B' {h}")
    author_date_str = run_cmd(f"git log -1 --format='%ai' {h}")
    committer_date_str = run_cmd(f"git log -1 --format='%ci' {h}")
    commit_details.append({
        'hash': h,
        'message': msg,
        'author_date': author_date_str,
        'committer_date': committer_date_str
    })

# 2. Subtract 14 days
print("Calculating new dates (subtracting 14 days)...")
for details in commit_details:
    ad = datetime.datetime.fromisoformat(details['author_date'])
    cd = datetime.datetime.fromisoformat(details['committer_date'])
    
    new_ad = ad - datetime.timedelta(days=14)
    new_cd = cd - datetime.timedelta(days=14)
    
    details['new_author_date'] = new_ad.isoformat()
    details['new_committer_date'] = new_cd.isoformat()

# 3. Create orphan branch
print("Creating orphan branch main-rewritten...")
run_cmd("git checkout --orphan main-rewritten")
subprocess.run("git rm -rf .", shell=True, capture_output=True)

# 4. Apply commits
new_author_name = "sivasaishasankar"
new_author_email = "sivasaishasankar@users.noreply.github.com"

for i, details in enumerate(commit_details):
    print(f"[{i+1}/{len(commit_details)}] Rewriting commit {details['hash']} -> new date: {details['new_author_date']}")
    
    # Clean the working directory and index
    subprocess.run("git rm -rf .", shell=True, capture_output=True)
    
    # Restore files from the old commit
    run_cmd(f"git checkout {details['hash']} -- .")
    
    # Add all files to staging
    run_cmd("git add -A")
    
    # Commit with custom author/committer info
    env = dict(os.environ)
    env["GIT_AUTHOR_NAME"] = new_author_name
    env["GIT_AUTHOR_EMAIL"] = new_author_email
    env["GIT_COMMITTER_NAME"] = new_author_name
    env["GIT_COMMITTER_EMAIL"] = new_author_email
    env["GIT_AUTHOR_DATE"] = details['new_author_date']
    env["GIT_COMMITTER_DATE"] = details['new_committer_date']
    
    run_cmd("git commit --allow-empty -F -", env=env, input_data=details['message'])

print("Successfully rewrote history!")
