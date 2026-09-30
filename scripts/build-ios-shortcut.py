"""Build the auditable unsigned shortcut; sign with Apple's shortcuts CLI."""
import plistlib
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'https://froggy-link.vercel.app/?url='
actions = []
def token(value, prefix=''):
    return {'WFSerializationType': 'WFTextTokenString', 'Value': {
        'string': prefix + '\ufffc',
        'attachmentsByRange': {'{%d, 1}' % len(prefix): value}}}
def attachment(value):
    return {'WFSerializationType': 'WFTextTokenAttachment', 'Value': value}
def output(identifier, name):
    return {'Type': 'ActionOutput', 'OutputUUID': identifier, 'OutputName': name}
def variable(name):
    return {'Type': 'Variable', 'VariableName': name}
def action(name, **params):
    identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, 'froggy-link/shortcut/v1/' + str(len(actions)))).upper()
    params['UUID'] = identifier
    actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + name, 'WFWorkflowActionParameters': params})
    return identifier

action('comment', WFCommentActionText='分享到 Froggy Link：僅將你分享或貼上的網址帶入 https://froggy-link.vercel.app/，不讀取剪貼簿。開啟後請按「新增」儲存。')
urls = action('detect.link', WFInput=token({'Type': 'ExtensionInput'}))
action('setvariable', WFVariableName='分享網址', WFInput=attachment(output(urls, 'URLs')))
group = '760CB241-648E-4C41-B326-C7225B54A271'
action('conditional', GroupingIdentifier=group, WFControlFlowMode=0, WFCondition=101,
       WFInput={'Type':'Variable','Variable':{'Value':variable('分享網址'),'WFSerializationType':'WFTextTokenAttachment'}})
asked = action('ask', WFAskActionPrompt='請貼上要收藏的完整網址（https://…）', WFInputType='Text')
urls = action('detect.link', WFInput=token(output(asked, 'Provided Input')))
action('setvariable', WFVariableName='分享網址', WFInput=attachment(output(urls, 'URLs')))
action('conditional', GroupingIdentifier=group, WFControlFlowMode=2)
group = '455260A3-76DC-4129-A154-6D123624143F'
action('conditional', GroupingIdentifier=group, WFControlFlowMode=0, WFCondition=101,
       WFInput={'Type':'Variable','Variable':{'Value':variable('分享網址'),'WFSerializationType':'WFTextTokenAttachment'}})
action('alert', WFAlertActionTitle='找不到連結', WFAlertActionMessage='請從來源 App 分享連結，或重新執行並貼上完整的 https:// 網址。', WFAlertActionCancelButtonShown=False)
action('exit')
action('conditional', GroupingIdentifier=group, WFControlFlowMode=2)
first = action('getitemfromlist', WFItemSpecifier='First Item', WFInput=attachment(variable('分享網址')))
encoded = action('urlencode', WFEncodeMode='Encode', WFInput=token(output(first, 'Item from List')))
url = action('url', WFURLActionURL=token(output(encoded, 'URL Encoded Text'), PREFIX))
action('openurl', WFInput=attachment(output(url, 'URL')))
workflow = {
    'WFWorkflowName':'分享到 Froggy Link',
    'WFWorkflowClientVersion':'2600.0.0',
    'WFWorkflowMinimumClientVersion':900,
    'WFWorkflowMinimumClientVersionString':'900',
    'WFWorkflowIcon':{'WFWorkflowIconStartColor':431817727,'WFWorkflowIconGlyphNumber':59812},
    'WFWorkflowTypes':['ActionExtension'],
    'WFWorkflowInputContentItemClasses':['WFURLContentItem','WFStringContentItem','WFSafariWebPageContentItem'],
    'WFWorkflowHasShortcutInputVariables':True,
    'WFWorkflowImportQuestions':[],
    'WFWorkflowActions':actions,
}
path = ROOT / 'shortcuts/share-to-froggy-link.plist'
path.write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_XML, sort_keys=False))
print(path)

(ROOT / 'shortcuts/share-to-froggy-link.unsigned.shortcut').write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_BINARY))
