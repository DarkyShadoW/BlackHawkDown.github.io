"use strict";
function assetBin(n){
  return fetch('assets/models/world/' + n + '.bin').then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.arrayBuffer();
  });
}
function assetPng(n){
  return 'assets/textures/models/' + n + (n === 'soldiers' ? '.jpg' : '.png');
}
function preloadCoreMeshes(){
  const sNames = ['militia', 'ranger', 'delta'];
  const gNames = ['m16', 'm16a1', 'm249', 'car15', 'car15n', 'ak', 'rpg', 'alice'];
  const sJobs = sNames.map(k =>
    fetch('assets/models/soldiers/' + k + '.bin')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(buf => parseSoldBin(k, buf))
  );
  const gJobs = gNames.map(k =>
    fetch('assets/models/weapons/' + k + '.bin')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(buf => parseGunBin(k, buf))
  );
  return Promise.all(sJobs.concat(gJobs));
}
