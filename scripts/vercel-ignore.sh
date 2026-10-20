#!/bin/sh
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 skips the build, non-zero builds.
# VERCEL_ENV isn't set at this step, so gate on the branch (see spec/tasks/phase-4-testing-ci.md).

# Previews: skip every branch except main (env vars are Production-only, so previews have no DB).
if [ -n "$VERCEL_GIT_COMMIT_REF" ] && [ "$VERCEL_GIT_COMMIT_REF" != main ]; then
  echo "Skipping: preview branch $VERCEL_GIT_COMMIT_REF"
  exit 0
fi

# main: skip when the push only touches docs. For a merge commit HEAD^ is the previous main, so
# this covers the whole PR. If HEAD^ is missing (shallow clone), git fails and we build.
if git diff --quiet HEAD^ HEAD -- . ':(exclude)*.md' ':(exclude)spec/**' ':(exclude).claude/**' ':(exclude).github/**'; then
  echo "Skipping: docs-only change"
  exit 0
fi

echo "Building"
exit 1
