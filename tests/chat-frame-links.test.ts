import test from 'node:test';
import assert from 'node:assert/strict';
import { hydratePromptMessages, migrateState, seedTasks } from '../src/features/workbench/model.ts';
import { buildVersions, resolveFrameRequest, type Capture } from '../src/features/iteration-gallery/model.ts';

const captures: Capture[] = [
 {id:'prompt',filename:'prompt',kind:'prompt',number:276,url:'gallery/images/prompt.png',timestamp:10,fullPrompt:'Complete original prompt',summary:'Short summary',branch:'feature',width:100,height:80,added:null,removed:null},
 {id:'push',filename:'push',kind:'push',number:29,url:'gallery/images/push.png',timestamp:20,summary:'Push',branch:'feature',width:100,height:80,added:null,removed:null},
];
test('chat resolves full prompt, image, version and the exact prompt frame rather than its push', () => {
 const task=hydratePromptMessages(seedTasks(),captures)[0];
 assert.equal(task.messages[0].text,'Complete original prompt');
 assert.deepEqual(task.messages[1].versionOutput,{prompt:276,version:29,imageUrl:'gallery/images/prompt.png',frameId:'prompt'});
 const versions=buildVersions(captures);
 assert.equal(resolveFrameRequest(versions,{frameId:task.messages[1].versionOutput!.frameId!})?.kind,'prompt');
 assert.equal(resolveFrameRequest(versions,{version:29})?.id,'push');
 assert.equal(resolveFrameRequest(versions,{frameId:'missing'}),undefined);
});
test('sample refresh preserves edited messages, appended exchanges, drafts and drawer state', () => {
 const saved=migrateState(null);
 saved.sampleContentVersion=2;
 saved.tasks[0].messages[0]={...saved.tasks[0].messages[0],sourcePrompt:undefined,text:'My edited prompt'};
 saved.tasks[0].messages.push({id:'custom',role:'user',name:'You',time:'now',text:'Keep this'});
 saved.drafts.panel='Unsent draft';
 const migrated=migrateState(saved);
 assert.equal(migrated.tasks[0].messages[0].text,'My edited prompt');
 assert.equal(migrated.tasks[0].messages.at(-1)?.text,'Keep this');
 assert.deepEqual(migrated.drafts,saved.drafts);
 assert.deepEqual(migrated.chatComposers,saved.chatComposers);
});
