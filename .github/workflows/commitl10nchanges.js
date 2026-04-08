import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

async function syncCrowdinTranslations() {
    const octokit = new Octokit({
        auth: process.env.DEADCODEBOT_PAT
    });
    
    const [owner, repo] = ["DeadCodeGames", "DeadForgeStore"];
    const masterBranch = '2025/2026';
    const l10nBranch = 'l10n_crowdin_translations';
    
    console.log('Starting Crowdin translations sync...');
    
    try {
        // Get master branch reference
        console.log('Fetching master branch...');
        const { data: masterRef } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${masterBranch}`
        });
        
        // Get master commit and tree
        const { data: masterCommit } = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: masterRef.object.sha
        });
        
        // Backup locale files from current working directory
        console.log('Backing up locale files...');
        const localeBackup = await backupLocaleFilesFromWorkspace();
        
        // Check if l10n branch exists
        let l10nBranchExists = false;
        let l10nRef = null;
        
        try {
            console.log('Checking if branch l10n_crowdin_translations exists...');
            const { data: ref } = await octokit.git.getRef({
                owner,
                repo,
                ref: `heads/${l10nBranch}`
            });
            l10nRef = ref;
            l10nBranchExists = true;
            console.log('Branch l10n_crowdin_translations exists, using it...');
        } catch (error) {
            if (error.status === 404) {
                console.log('Creating new branch l10n_crowdin_translations from master...');
                l10nBranchExists = false;
            } else {
                throw error;
            }
        }
        
        let baseSha;
        
        if (l10nBranchExists) {
            // Get latest commit from l10n branch
            const { data: l10nCommit } = await octokit.git.getCommit({
                owner,
                repo,
                commit_sha: l10nRef.object.sha
            });
            baseSha = l10nCommit.tree.sha;
        } else {
            // Use master as base
            baseSha = masterCommit.tree.sha;
        }
        
        // Restore locale files from backup
        console.log('Restoring locale files from backup...');
        const newTree = await restoreLocaleFilesFromWorkspace(octokit, owner, repo, baseSha, localeBackup);
        
        // Check if there are any changes
        if (newTree.length === 0) {
            console.log('No changes detected in locale files');
            core.setOutput('BRANCH_EXISTS', 'true');
            return;
        }
        
        // Create new tree with restored locale files
        const { data: tree } = await octokit.git.createTree({
            owner,
            repo,
            base_tree: baseSha,
            tree: newTree
        });
        
        // Create commit
        const { data: newCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: 'chore(i18n): sync Crowdin translations',
            tree: tree.sha,
            parents: l10nBranchExists ? [l10nRef.object.sha] : [masterRef.object.sha]
        });
        
        if (l10nBranchExists) {
            // Update existing branch
            await octokit.git.updateRef({
                owner,
                repo,
                ref: `heads/${l10nBranch}`,
                sha: newCommit.sha
            });
        } else {
            // Create new branch
            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${l10nBranch}`,
                sha: newCommit.sha
            });
        }
        
        console.log('Successfully synced Crowdin translations');
        core.setOutput('BRANCH_EXISTS', 'true');
        
    } catch (error) {
        console.error('Error syncing Crowdin translations:', error);
        throw error;
    }
}

async function backupLocaleFilesFromWorkspace() {
    const localeFiles = [];
    const localesDir = 'src/locales';
    
    if (!fs.existsSync(localesDir)) {
        console.log('No src/locales directory found');
        return localeFiles;
    }
    
    // Recursively find all files in src/locales
    function findFiles(dir) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                findFiles(filePath);
            } else {
                // Convert to forward slashes for consistency
                const relativePath = filePath.replace(/\\/g, '/');
                const content = fs.readFileSync(filePath, 'utf-8');
                localeFiles.push({
                    path: relativePath,
                    content: content
                });
            }
        }
    }
    
    findFiles(localesDir);
    console.log(`Backed up ${localeFiles.length} locale files`);
    return localeFiles;
}

async function restoreLocaleFilesFromWorkspace(
    octokit,
    owner,
    repo,
    baseSha,
    localeBackup
) {
    if (localeBackup.length === 0) {
        console.log('No locale files to restore');
        return [];
    }
    
    const changedFiles = [];

    // Fetch the full base tree (recursive) once so we can compare file SHAs
    const { data: baseTree } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: baseSha,
        recursive: 'true'
    });
    const existingBlobs = new Map(
        baseTree.tree
            .filter(item => item.type === 'blob')
            .map(item => [item.path, item.sha])
    );

    // Only stage files that have actually changed
    for (const backupFile of localeBackup) {
        const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content: backupFile.content,
            encoding: 'utf-8'
        });

        const existingSha = existingBlobs.get(backupFile.path);
        if (existingSha === blob.sha) {
            console.log(`Skipping unchanged file: ${backupFile.path}`);
            continue;
        }

        changedFiles.push({
            path: backupFile.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
        });
    }

    console.log(`${changedFiles.length} locale file(s) changed out of ${localeBackup.length}`);
    return changedFiles;
}

syncCrowdinTranslations();
