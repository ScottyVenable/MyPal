import React from 'react';
import styled from 'styled-components';

const Checkbox = () => {
  return (
    <StyledWrapper>
      <label className="container">
        <input type="checkbox" />
        <div className="checkbox-wrapper">
          <div className="checkmark" />
          <div className="nebula-glow" />
          <div className="sparkle-container" />
        </div>
      </label>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Container styling */
  .container {
    display: inline-block;
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  /* Hide default checkbox */
  .container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  /* Wrapper for checkbox elements */
  .checkbox-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Checkmark (square transforming to star) */
  .checkmark {
    position: absolute;
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #0a0a23, #1c2526);
    border: 2px solid #4b5eaa;
    border-radius: 12px;
    transition:
      transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55),
      background 0.3s ease-in-out,
      border-color 0.3s ease,
      border-radius 0.3s ease;
    box-shadow: 0 0 8px rgba(75, 94, 170, 0.3);
  }

  /* Hover effect */
  .container:hover .checkmark {
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(75, 94, 170, 0.5);
  }

  /* Checked state: Transform to star shape */
  .container input:checked ~ .checkbox-wrapper .checkmark {
    background: linear-gradient(135deg, #ff5e62, #ffd452);
    border-color: #ffd452;
    border-radius: 50%;
    transform: rotate(45deg) scale(1.2);
    box-shadow: 0 0 20px rgba(255, 212, 82, 0.8);
  }

  /* Star checkmark symbol (pseudo-element) */
  .checkmark::after {
    content: "";
    position: absolute;
    display: none;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    background: transparent;
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    transition:
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1.6),
      opacity 0.3s ease-in-out;
  }

  /* Show star when checked */
  .container input:checked ~ .checkbox-wrapper .checkmark::after {
    display: block;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  /* Nebula glow effect */
  .nebula-glow {
    position: absolute;
    width: 40px;
    height: 40px;
    background: radial-gradient(
      circle,
      rgba(75, 94, 170, 0.3) 10%,
      transparent 70%
    );
    border-radius: 50%;
    opacity: 0.5;
    transition:
      opacity 0.3s ease,
      transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Nebula swirl when checked */
  .container input:checked ~ .checkbox-wrapper .nebula-glow {
    opacity: 1;
    transform: rotate(180deg);
    background: radial-gradient(
      circle,
      rgba(255, 94, 170, 0.5) 10%,
      rgba(255, 212, 82, 0.3) 70%
    );
    animation: swirl 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Swirl animation keyframes */
  @keyframes swirl {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Sparkle effect */
  .sparkle-container {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* Sparkle particles */
  .sparkle-container::before,
  .sparkle-container::after {
    content: "";
    position: absolute;
    width: 4px;
    height: 4px;
    background: #ffd452;
    border-radius: 50%;
    opacity: 0;
    transition: all 0.6s ease;
  }

  /* Sparkle animation when checked */
  .container input:checked ~ .checkbox-wrapper .sparkle-container::before {
    transform: translate(12px, -12px);
    opacity: 1;
    animation: twinkle 0.8s cubic-bezier(0.5, 0, 0.5, 1) forwards;
  }

  .container input:checked ~ .checkbox-wrapper .sparkle-container::after {
    transform: translate(-12px, 12px);
    background: #ff5e62;
    opacity: 1;
    animation: twinkle 0.8s cubic-bezier(0.5, 0, 0.5, 1) 0.2s forwards;
  }

  /* Twinkle animation keyframes */
  @keyframes twinkle {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.5) translate(10px, -10px);
      opacity: 0;
    }
  }

  /* Pulse effect on hover */
  .checkbox-wrapper::before {
    content: "";
    position: absolute;
    width: 48px;
    height: 48px;
    background: rgba(75, 94, 170, 0.2);
    border-radius: 50%;
    transform: scale(0);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1.4);
    z-index: -1;
  }

  .container:hover .checkbox-wrapper::before {
    transform: scale(1);
  }

  /* Bounce animation when checked */
  .container input:checked ~ .checkbox-wrapper .checkmark {
    animation: bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  /* Bounce keyframes */
  @keyframes bounce {
    0%,
    100% {
      transform: rotate(45deg) scale(1.2);
    }
    50% {
      transform: rotate(45deg) scale(1.4);
    }
  }`;

export default Checkbox;

// Link: https://uiverse.io/chase2k25/spicy-chipmunk-55