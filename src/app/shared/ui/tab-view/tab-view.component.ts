import { Component, contentChildren, input, linkedSignal, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TabPanelDirective } from './tab-panel.directive';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: string | number;
}

@Component({
  selector: 'app-tab-view',
  templateUrl: './tab-view.component.html',
  styleUrl: './tab-view.component.scss',
  imports: [NgTemplateOutlet],
})
export class TabViewComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly activeTab = input<string>('');

  readonly activeTabChange = output<string>();

  protected readonly panels = contentChildren(TabPanelDirective);
  protected readonly activeTabId = linkedSignal(() => this.activeTab() || (this.tabs()[0]?.id ?? ''));

  protected isActive(tabId: string): boolean {
    return this.activeTabId() === tabId;
  }

  protected isTabDisabled(tab: TabItem): boolean {
    return tab.disabled ?? false;
  }

  protected selectTab(tab: TabItem): void {
    if (tab.disabled) return;
    this.activeTabId.set(tab.id);
    this.activeTabChange.emit(tab.id);
  }

  protected getPanel(tabId: string): TabPanelDirective | undefined {
    return this.panels().find((p) => p.tabId() === tabId);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const enabledTabs = this.tabs().filter((t) => !t.disabled);
    const currentEnabledIdx = enabledTabs.findIndex((t) => t.id === this.activeTabId());

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = enabledTabs[(currentEnabledIdx + 1) % enabledTabs.length];
      if (next) this.selectTab(next);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = enabledTabs[(currentEnabledIdx - 1 + enabledTabs.length) % enabledTabs.length];
      if (prev) this.selectTab(prev);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (enabledTabs[0]) this.selectTab(enabledTabs[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabledTabs[enabledTabs.length - 1];
      if (last) this.selectTab(last);
    }
  }
}
