import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcrUploadComponent } from './ocr-upload.component';

describe('OcrUploadComponent', () => {
  let component: OcrUploadComponent;
  let fixture: ComponentFixture<OcrUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OcrUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcrUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
