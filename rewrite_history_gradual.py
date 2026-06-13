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
N = len(commit_hashes)
print(f"Found {N} commits to rewrite.")

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

# 2. Distribute dates over 2 weeks ending 14 days ago
print("Distributing dates...")
today = datetime.date.today()
# End of 2-week window is 14 days ago, start is 28 days ago
start_date = today - datetime.timedelta(days=28)
end_date = today - datetime.timedelta(days=14)

for i, details in enumerate(commit_details):
    # Parse the original commit date to keep timezone and time
    ad = datetime.datetime.fromisoformat(details['author_date'])
    cd = datetime.datetime.fromisoformat(details['committer_date'])
    
    # Calculate the target date for this commit
    fraction = i / max(1, N - 1)
    target_day = start_date + datetime.timedelta(seconds=int(fraction * (end_date - start_date).total_seconds()))
    
    # Combine target date with original time and timezone
    new_ad = datetime.datetime.combine(target_day, ad.time()).replace(tzinfo=ad.tzinfo)
    new_cd = datetime.datetime.combine(target_day, cd.time()).replace(tzinfo=cd.tzinfo)
    
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
    print(f"[{i+1}/{N}] Rewriting commit {details['hash']} -> new date: {details['new_author_date']}")
    
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
