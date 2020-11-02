# CI with GitHub actions 
   We have decided to adopt `GitHub Actions` as our framework for continuous integration. We have implemented two workflows. 
The `PR Creation` workflow installs, builds, and tests the application. The `Merge` workflow installs, builds, and deploys the
application to `NPM`.

## Refactoring the workflows

   The `PR Creation` targets the `pull_request` event on the `master branch`. The workflow depends on `Node` and `MongoDB`. 
The build-and-test job has a `MongoDB` step which uses a custom action `supercharge/mongodb-github-action@1.3.0` and is needed to
be able to run unit tests during the build process. 

   The `Merge` will deploy a new version of the application to `NPM`, but it requirers access to the proper security token
in `NPM`, and will therefore only run in the GitHub environment. The action targets the `push` event on the `master` branch, which is
in effect what happens when a PR is merged into the `master` branch.

## Testing workflows in local environments

   It is advice for one to test a workflow before creating a PR. To test workflows locally we recommend using the `act` tool. You can install
`act` by following the instructions provided [here](https://github.com/nektos/act#installation). To use `act` you need `docker`, we recommend
following the instructions [here](https://github.com/nektos/act#installation) to install docker. 
   
## Additional information

   To learn more about `GitHub` actions visit the [documentation website](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions) .
In the `PR Creation` workflow we used a custom action to instantiate a `MongoDB` instance, you can find additional custom actions [here](https://github.com/marketplace?type=actions).
