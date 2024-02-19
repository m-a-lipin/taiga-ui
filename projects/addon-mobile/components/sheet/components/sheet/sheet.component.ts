import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    Inject,
    Input,
    NgZone,
    QueryList,
    Self,
    ViewChild,
    ViewChildren,
} from '@angular/core';
import {
    EMPTY_QUERY,
    TUI_IS_IOS,
    TuiDestroyService,
    tuiPure,
    tuiZonefull,
} from '@taiga-ui/cdk';
import {tuiSlideInTop} from '@taiga-ui/core';
import {TUI_MORE_WORD} from '@taiga-ui/kit';
import {Observable, timer} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

import {TuiSheet, TuiSheetRequiredProps} from '../../sheet';
import {TUI_SHEET_SCROLL} from '../../sheet-tokens';
import {TUI_SHEET_ID} from '../sheet-heading/sheet-heading.component';
import {TUI_SHEET_PROVIDERS} from './sheet.providers';

@Component({
    selector: 'tui-sheet',
    templateUrl: './sheet.template.html',
    styleUrls: ['./sheet.style.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: TUI_SHEET_PROVIDERS,
    host: {
        role: 'dialog',
        '[attr.aria-labelledby]': 'id',
        '[class._ios]': 'isIos',
        // '[class._stuck]': 'true', // Initially disable snapping for Firefox
        '[$.class._stuck]': 'stuck$',
        '($.class._stuck)': 'stuck$',
    },
    animations: [tuiSlideInTop],
})
export class TuiSheetComponent<T> implements TuiSheetRequiredProps<T>, AfterViewInit {
    @ViewChild('sheet')
    private readonly sheet?: ElementRef<HTMLElement>;

    @ViewChild('content')
    private readonly content?: ElementRef<HTMLElement>;

    @ViewChildren('stops')
    private readonly stopsRefs: QueryList<ElementRef<HTMLElement>> = EMPTY_QUERY;

    @Input()
    item!: TuiSheet<T>;

    id = '';

    readonly stuck$ = this.scroll$.pipe(map(y => Math.floor(y) > this.contentTop));

    constructor(
        @Inject(TUI_SHEET_SCROLL) private readonly scroll$: Observable<number>,
        @Inject(ElementRef) private readonly el: ElementRef<HTMLElement>,
        @Inject(NgZone) private readonly zone: NgZone,
        @Inject(TUI_IS_IOS) readonly isIos: boolean,
        @Inject(TUI_MORE_WORD) readonly moreWord$: Observable<string>,
        @Self() @Inject(TuiDestroyService) private readonly destroy$: Observable<void>,
    ) {}

    get stops(): readonly number[] {
        return this.getStops(this.stopsRefs);
    }

    get imageStop(): number {
        return (this.item.imageSlide && this.stops[this.stops.length - 1]) || 0;
    }

    get imageHeight(): number {
        return this.contentTop - this.sheetTop;
    }

    @tuiPure
    get context(): TuiSheet<T> {
        return {
            ...this.item,
            scroll$: this.scroll$.pipe(tuiZonefull(this.zone)),
        };
    }

    @HostListener(TUI_SHEET_ID, ['$event.detail'])
    onId(id: string): void {
        this.id = id;
    }

    ngAfterViewInit(): void {
        this.el.nativeElement.scrollTop = [...this.stops, this.sheetTop, this.contentTop][
            this.item.initial
        ];
    }

    scrollTo(top: number = this.sheetTop): void {
        const {nativeElement} = this.el;

        if (this.isIos) {
            const offset = top - nativeElement.scrollTop - 16;

            nativeElement.style.transition = 'none';
            nativeElement.style.transform = `scaleX(-1) translate3d(0, ${offset}px, 0)`;

            timer(0)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    nativeElement.style.transition = '';
                    nativeElement.style.transform = '';
                });
        }

        nativeElement.scrollTo({top, behavior: 'smooth'});
    }

    close(): void {
        if (this.context.closeable) {
            this.context.$implicit.complete();
        }
    }

    private get contentTop(): number {
        return this.content?.nativeElement.offsetTop ?? Infinity;
    }

    private get sheetTop(): number {
        return this.sheet?.nativeElement.offsetTop ?? Infinity;
    }

    @tuiPure
    private getStops(stops: QueryList<ElementRef<HTMLElement>>): readonly number[] {
        return stops.map(
            ({nativeElement}) => nativeElement.offsetTop + nativeElement.clientHeight,
        );
    }
}
