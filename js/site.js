(function(){
  var b=document.getElementById('burger'),n=document.getElementById('nav');
  function set(o){n.classList.toggle('open',o);b.setAttribute('aria-expanded',o)}
  b.addEventListener('click',function(){set(!n.classList.contains('open'))});
  n.addEventListener('click',function(e){if(e.target.tagName==='A')set(false)});
  var form=document.getElementById('tilbod');
  if(form) form.addEventListener('submit',function(e){e.preventDefault();document.getElementById('formmsg').style.display='block'});
})();
