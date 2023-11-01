npm i --force
git config user.name "GoCD Automation"
git config user.email "no-reply@dotglitch.dev"

# Clear anything that's out of place.
git stash

cd src
    npm version patch
    version=$(npm version --json | jq '.["ngx-stackedit"]' | tr -d '"')
cd ..

git add src/package.json
git commit -m "⚛ Bump version"

echo "extracted version: $version"

npm i \
    @angular/animations@15 \
    @angular/cdk@15 \
    @angular/common@15 \
    @angular/compiler@15 \
    @angular/core@15 \
    @angular/forms@15 \
    @angular/material@15 \
    @angular/platform-browser@15 \
    @angular/platform-browser-dynamic@15 \
    @angular/service-worker@15 \
    @angular-devkit/build-angular@15 \
    @angular/cli@15 \
    @angular/compiler-cli@15 \
    --force

npm run build

git push
git tag v$version
git push origin v$version
