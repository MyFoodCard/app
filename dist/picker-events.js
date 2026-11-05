export function bindPickerDismissal(root,close,eventRoot=root.ownerDocument){
  // Tapping a Safari button may blur the search with relatedTarget=null before click.
  // Wait for a concrete destination instead of hiding the result during that blur.
  const closeOutside=event=>{if(!root.contains(event.target))close();};
  eventRoot.addEventListener('pointerdown',closeOutside);
  eventRoot.addEventListener('focusin',closeOutside);
}
