import { Directive, ElementRef, HostListener, Renderer2, OnInit } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective implements OnInit {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.renderer.addClass(this.el.nativeElement, 'seasonal-highlight');
  }

  @HostListener('pointerenter')
  onPointerEnter() {
    this.renderer.addClass(this.el.nativeElement, 'seasonal-highlight-active');
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.renderer.setStyle(this.el.nativeElement, '--mouse-x', `${x}px`);
    this.renderer.setStyle(this.el.nativeElement, '--mouse-y', `${y}px`);
  }

  @HostListener('pointerleave')
  onPointerLeave() {
    this.renderer.removeClass(this.el.nativeElement, 'seasonal-highlight-active');
  }
}
