import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Welcome to 5 Billion Stars Camping & Agro Tourism ';
  showForm = false;
  bookinForm!:FormGroup
 
  constructor(public fb:FormBuilder){
    this.bookinForm = this.fb.group({
      fromdate: ['', [Validators.required]],
      todate: ['', [Validators.required]],
      name: ['', [Validators.required]],
      guest: ['', [Validators.required]],
      phone: ['', [Validators.required]]
    });
  }
  
  
  openForm(){
    console.log("OPEN ")
  this.showForm = !this.showForm;
  }
  onSubmit(){
    if (this.bookinForm.valid) {
      const formData = this.bookinForm.value;
      const whatsappNumber = '8624908808';
      const message = `From Date: ${formData.fromdate}\n To Date: ${formData.todate}\n Name: ${formData.name}\n Guest: ${formData.guest}\n Mobile No: ${formData.phone}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
     alert('Please fill out all required fields.');
   }
  }
}


