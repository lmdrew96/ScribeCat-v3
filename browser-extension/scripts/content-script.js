/**
 * ScribeCat Canvas Course Collector
 * Content script that detects courses on Canvas LMS pages.
 * Runs on *.instructure.com and stores detected courses in chrome.storage.local.
 */

class CanvasCourseCollector {
  constructor() {
    this.courses = new Set();
  }

  /** Strategy 1: Dashboard cards (most common Canvas layout) */
  collectFromDashboardCards() {
    // Modern Canvas dashboard card titles
    const cardTitles = document.querySelectorAll(
      '.ic-DashboardCard__header_title, [data-testid="dashboard-card-title"]',
    );
    for (const el of cardTitles) {
      const name = el.textContent?.trim();
      if (name) this.courses.add(name);
    }
  }

  /** Strategy 2: Dashboard card links */
  collectFromDashboardLinks() {
    const links = document.querySelectorAll(
      '.ic-DashboardCard__link, a[href*="/courses/"] .ic-DashboardCard__header-title',
    );
    for (const el of links) {
      const name = el.getAttribute('title') || el.textContent?.trim();
      if (name) this.courses.add(name);
    }
  }

  /** Strategy 3: Course navigation sidebar */
  collectFromSideNav() {
    const navLinks = document.querySelectorAll(
      '#section-tabs .section a, .course-list-favorite-course .name, ul.ic-app-header__menu-list a',
    );
    for (const el of navLinks) {
      // Only pick course-related links
      const href = el.getAttribute('href') || '';
      if (href.includes('/courses/')) {
        const name = el.textContent?.trim();
        if (name && name.length > 2) this.courses.add(name);
      }
    }
  }

  /** Strategy 4: Course list table rows (All Courses page) */
  collectFromCourseTable() {
    const rows = document.querySelectorAll(
      'table.ic-Table tbody tr td:first-child a, .course-list-table-row .name a',
    );
    for (const el of rows) {
      const name = el.textContent?.trim();
      if (name) this.courses.add(name);
    }
  }

  /** Wait for dashboard elements to load (Canvas is an SPA) */
  waitForElements(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const existing = document.querySelectorAll(selector);
      if (existing.length > 0) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver((_mutations, obs) => {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          obs.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(document.querySelectorAll(selector));
      }, timeout);
    });
  }

  /** Run all collection strategies and store results */
  async collect() {
    // Wait for Canvas dashboard to render
    await this.waitForElements(
      '.ic-DashboardCard__header_title, table.ic-Table, .course-list-favorite-course',
    );

    this.collectFromDashboardCards();
    this.collectFromDashboardLinks();
    this.collectFromSideNav();
    this.collectFromCourseTable();

    const courseList = Array.from(this.courses).sort();

    if (courseList.length > 0) {
      chrome.storage.local.set({
        scribecatCourses: courseList,
        scribecatLastDetected: Date.now(),
      });

      // Notify background script to update badge
      chrome.runtime.sendMessage({
        type: 'COURSES_DETECTED',
        count: courseList.length,
      });
    }

    return courseList;
  }
}

// Run collector
const collector = new CanvasCourseCollector();
collector.collect();
