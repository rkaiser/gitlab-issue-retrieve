# Gitlab Issue Retriever
Using the gitlab API this tool will read the issues that exist in the gitlab project and output them as a markdown list into a file that can be used to produce the release notes for the version that is associated with these issues. This tool expects an argument that identifies the repository from which teh issues will be querried. By default this tool will look for those issues that have been labeled `Release`. It is also configured to read the environment for the id of the resource as well as the token to the repository.

You can use node to execute the command. The following are the options that are available with command:
```
Arguments:
    string                   URL to the gitlab repository including protocol

Options:
    -l, --label <string>     gitlab label to search (default: "Release")
    -r, --resource <string>  gitlab resource to search, projects or groups (default: "projects")
    -i, --id <number>        id of project or group to search (env: GITLAB_RESOURCE_ID)
    -t, --token <string>     token for repo (env: REPO_TOKEN)
    -h, --help               display help for command
```

If you are using the token and project id from the environment you can retrieve all issues that are tagged `Release` using the following command:
```bash
npx ts-node index.ts https://myrepo.site.com
```

To retrieve all issues that are tagged `Vetted` while still using the environment for id and token, use the following command:

```bash
npx tx-node index.ts --label Vetted https://myrepo.site.com
```

To specify a different resource (i.e. group instead of project) and want to specify the id, use the following command:
```bash
npx ts-node index.ts --resource groups --id 1234 https://myrepo.site.com
```
