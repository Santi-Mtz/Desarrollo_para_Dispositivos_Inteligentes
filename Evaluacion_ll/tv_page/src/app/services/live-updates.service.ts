import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface WikiUpdateEvent {
  type: string;
  timestamp: string;
  tables?: string[];
}

@Injectable({ providedIn: 'root' })
export class LiveUpdatesService {
  private readonly eventsUrl = '/api/events/wiki';

  watchWikiUpdates(): Observable<WikiUpdateEvent> {
    return new Observable<WikiUpdateEvent>((observer) => {
      const source = new EventSource(this.eventsUrl);

      source.onmessage = (event) => {
        try {
          observer.next(JSON.parse(event.data) as WikiUpdateEvent);
        } catch {
          observer.next({ type: 'heartbeat', timestamp: new Date().toISOString() });
        }
      };

      source.onerror = () => {
        // EventSource reconnects automatically; do not complete the stream on transient errors.
      };

      return () => {
        source.close();
      };
    });
  }
}
