import { base } from '$lib/server/db.js';

const BLACKHOLE_TABLE = 'BlackholeSubmissions';
const PROJECTS_TABLE = 'Projects'

/**
 * Yes I know this is a copy of the server/blackhole.js but this does more
 * @returns {Promise<any[]>}
 */
export async function getPendingBlackholeReviews() {
    const records = await base(BLACKHOLE_TABLE) 
        .select({
            filterByFormula: `{Status} = "pending"`
        })
        .all();

    const results = [];

    for (const rec of records) {
        const f = rec.fields ?? {};

        let project = null;
        const projectId = Array.isArray(f.project) ? f.Project[0] : null; 

        if (projectId) {
            try {
                const projectRec = await base(PROJECTS_TABLE)._base.find(projectId);
                const pf = projectRec.fields ?? {};

                project = {
                    id: projectRec.id,
                    name: pf.projectname ?? 'Untitled project',
                    description: pf.description ?? '',
                    promptinfo: pf.promptinfo ?? '',
                    shipURL: pf.shipURL ?? '',
                    githubURL: pf.githubURL ?? '',
                    projectImage: pf.projectImage ?? '',
                    egg: pf.egg ?? '',
                    hackatimeHours: pf.hackatimeHours ?? null
                };
            } catch (e) {
                console.error('Error fetching project for review :( ', projectId, e);
            }
        }
        
        results.push({
            id: rec.id, 
            status:f.Status ?? 'pending',
            username: f.Username ?? null,
            userId: Array.isArray(f.User) ? f.User[0] : null,
            projectId,
            coinsSpent: f.CoinsSpent ?? 0,
            coinsBefore: f.CoinsBefore ?? null,
            coinsAfter: f.CoinsAfter ?? null,
            hackatimeHours: f.HackatimeHoursAtSubmission ?? null,
            stellarshipsAtSubmission: f.StellarshipsAtSubmission ?? null,
            justification: f.Justification ?? '',
            reviewer: f.Reviewer ?? null,
            reason: f.Reason ?? null,
            createdTime: rec._rawJson?.createdTime ?? null,
            project
        });
    }

    return results;
}