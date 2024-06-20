import axios, { AxiosResponse } from 'axios';
import { Command, Option, OptionValues } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();
program
    .argument('<string>', 'URL to the gitlab repository including protocol')
    .option('-l, --label <string>', 'gitlab label to search, i.e. Release')
    .option('-r, --resource <string>', 'gitlab resource to search, projects or groups', 'projects')
    .option('-s, --state <string>', 'issue state, can be all, opened, or closed', 'all')
    .option('-f, --file <string>', 'output file', 'file.md')
    .option('-a, --after <string>', 'closed after date')
    .option('-b, --before <string>', 'closed before date');
program.addOption(new Option('-i, --id <number>', 'id of project or group to search').env('GITLAB_RESOURCE_ID')); // 15124
program.addOption(new Option('-t, --token <string>', 'token for repo').env('REPO_TOKEN'));

program.parse(process.argv);
const options = program.opts();
retrieveIssues(program.args[0], options.resource, options.id, options.label, options.token, options.file, options.state, options);

/**
 * Retrieves the issues and saves them in the file.
 * @param repoUrl is the url including the protocol to the repository
 * @param resource is the type of resource that is being querried (groups | projects)
 * @param id is the id for the resource that is being querried.
 * @param label is the label that is being requested
 * @param token is the access token that is used to access the gitlab resource
 * @param file is the output file
 * @param state is the state (i.e. all, opened, or closed)
 * @param options are all the options provided to the program
 */
async function retrieveIssues(repoUrl: string, resource: 'groups' | 'projects', id: number, label: string, token: string, file: string, state: string, options: OptionValues) {
    const apiUrl = `${repoUrl}/api/v4/${resource}/${id}/issues`;
    let page = 1;
    const issues: any[] = [];
    const requestResponse = await executeRequest('HEAD', page, token, apiUrl, label, state);
    const totalPages = requestResponse.headers['x-total-pages'];
    // Execute requests to gitlab server
    while (totalPages > 0 && page <= totalPages)  {
        const responseWithIssues = await executeRequest('GET', page, token, apiUrl, label, state);
        page++;
        responseWithIssues.issues.forEach((issue) => issues.push(issue));
    }
    const fileWriteStream = fs.createWriteStream(path.join(__dirname, file));
    let filteredIssues: any = issues;
  // Date Range Filter
  if (options.after || options.before) {
    filteredIssues = issues.filter((issue) => issue.closed_at)
      .filter((issue) => options.after ? (new Date(Date.parse(issue.closed_at))).getTime() > (new Date(Date.parse(options.after))).getTime() : true)
      .filter((issue) => options.before ? (new Date(Date.parse(issue.closed_at))).getTime() < (new Date(Date.parse(options.before))).getTime() : true);

    console.log('using date range have this many closed, %o', filteredIssues.length);
    console.log('translated date range is %o - %o', (new Date(Date.parse(options.after))).toISOString(), (new Date(Date.parse(options.before))).toISOString());
  }

    filteredIssues.forEach((issue: any) => {
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
async function executeRequest(method: string, page: number, token: string, apiUrl: string, label: string, state: string = 'opened'): Promise<{headers: any; issues: any[]}> {
    axios.create();
    const params = {scope: 'all', state: state, per_page: 100, page: page};
    if (label) {
      Object.assign(params, {labels: label});
    }
    console.log('params are %o', params);
    console.log('url %o', apiUrl);
    const config = {
        method: method,
        url: apiUrl,
        // scope can be `all`, `assigned_to_me`, or `created_by_me`.
        // state can be `all` issues or limited to those that are `opened` or `closed`.
        // params: {labels: label, scope: 'all', state: state, per_page: 100, page: page},
        params: params,
        headers: {
            'PRIVATE-TOKEN': token
        }
    };

    return axios.request(config).then((response: AxiosResponse) => {
        return ({headers: response.headers, issues: response.data});
    });

}
