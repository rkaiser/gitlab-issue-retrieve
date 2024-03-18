import axios, { AxiosResponse } from 'axios';
import { Command, Option } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();
program
    .argument('<string>', 'URL to the gitlab repository including protocol')
    .option('-l, --label <string>', 'gitlab label to search', 'Release')
    .option('-r, --resource <string>', 'gitlab resource to search, projects or groups', 'projects');
program.addOption(new Option('-i, --id <number>', 'id of project or group to search').env('GITLAB_RESOURCE_ID')); // 15124
program.addOption(new Option('-t, --token <string>', 'token for repo').env('REPO_TOKEN'));

program.parse(process.argv);
const options = program.opts();
retrieveIssues(program.args[0], options.resource, options.id, options.label, options.token);

/**
 * Retrieves the issues and saves them in the file.
 * @param repoUrl is the url including the protocol to the repository
 * @param resource is the type of resource that is being querried (groups | projects)
 * @param id is the id for the resource that is being querried.
 * @param label is the labelled that is being requested
 * @param token is the access token that is used to access the gitlab resource
 */
async function retrieveIssues(repoUrl: string, resource: 'groups' | 'projects', id: number, label: string, token: string) {
    const apiUrl = `${repoUrl}/api/v4/${resource}/${id}/issues`;
    let page = 1;
    const issues: any[] = [];
    const requestResponse = await executeRequest('HEAD', page, token, apiUrl, label);
    const totalPages = requestResponse.headers['x-total-pages'];
    while (totalPages > 0 && page <= totalPages)  {
        const responseWithIssues = await executeRequest('GET', page, token, apiUrl, label);
        page++;
        responseWithIssues.issues.forEach((issue) => issues.push(issue));
    }
    const fileWriteStream = fs.createWriteStream(path.join(__dirname, 'file.md'));
    issues.forEach((issue: any) => {
        // Format should look similar to the following in order to paste in to markdown format:
        //  - [IBFE-840](https://path/to/issue/with/id/number) - Issue Title
        fileWriteStream.write(`- [IBFE-${issue.iid}](${issue.web_url}) - ${issue.title}\n`);
    });
    fileWriteStream.end();
    fileWriteStream.on('close', () => {
        console.log('finished writing file');
    });
    fileWriteStream.on('error',  (error) => {
        console.error('error writing file', error);
    });

}

/**
 * Performs the HTTP request and returns the results.
 * @param method is the http method that is used to make the request
 * @param page the page number that is being requested
 * @param token is the access token used to make the request
 * @param apiUrl is the url to the resource being requested
 * @param label is the label that is associated with the issue being returned
 * @returns 
 */
async function executeRequest(method: string, page: number, token: string, apiUrl: string, label: string): Promise<{headers: any; issues: any[]}> {
    axios.create();
    const config = {
        method: method,
        url: apiUrl,
        params: {labels: label, scope: 'all', state: 'opened', per_page: 100, page: page},
        headers: {
            'PRIVATE-TOKEN': token
        }
    };

    return axios.request(config).then((response: AxiosResponse) => {
        return ({headers: response.headers, issues: response.data});
    });

}
