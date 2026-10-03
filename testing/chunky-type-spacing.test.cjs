const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
  constructor(font){this.font=font;this.tagName='H2';this.children=[];this.props={};this.style={getPropertyValue:k=>this.props[k]?.value||'',getPropertyPriority:k=>this.props[k]?.priority||'',setProperty:(k,value,priority)=>{this.props[k]={value,priority};},removeProperty:k=>delete this.props[k]};}
  querySelectorAll(){return this.children;}
}
const chunky=new Element('DynaPuff, cursive'),clean=new Element('Plus Jakarta Sans'),body=new Element('Plus Jakarta Sans');body.children=[chunky,clean];let callback;
vm.runInNewContext(fs.readFileSync(require.resolve('../chunky-type-spacing.js'),'utf8'),{HTMLElement:Element,document:{body},getComputedStyle:el=>({fontFamily:el.font}),WeakMap,Set,MutationObserver:class{constructor(cb){callback=cb;}observe(){}}});
assert.equal(chunky.props['letter-spacing'].value,'.015em');assert.equal(chunky.props['letter-spacing'].priority,'important');assert(!clean.props['letter-spacing']);
const later=new Element('DynaPuff');callback([{type:'childList',addedNodes:[later]}]);assert.equal(later.props['letter-spacing'].value,'.015em');
chunky.font='Plus Jakarta Sans';callback([{type:'attributes',target:chunky}]);assert(!chunky.props['letter-spacing']);
console.log('Chunky typography: display-only spacing, dynamic headings and clean-font restoration passed.');
